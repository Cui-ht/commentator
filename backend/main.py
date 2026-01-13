from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import uuid
from datetime import datetime
from urllib.parse import urlparse, urljoin
import httpx
import re

from models import (
    User, UserCreate, UserResponse,
    Project, ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectShare,
    Comment, CommentCreate, CommentUpdate, CommentResponse,
    Line, LineCreate, LineUpdate, LineResponse,
    ShareRequest, ShareResponse,
    Page, PageCreate, PageUpdate, PageResponse,
)

DATABASE_URL = "sqlite+aiosqlite:///./annotate.db"
ASYNC_DATABASE_URL = "sqlite+aiosqlite:///./annotate.db"

engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    class_=AsyncSession
)

app = FastAPI(title="Annotate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Proxy endpoint to fetch external URLs and serve them from same origin
@app.get("/proxy")
async def proxy(url: str):
    """
    Proxy endpoint to fetch external URLs.
    Makes iframes same-origin, enabling scroll sync.
    """
    if not url:
        raise HTTPException(status_code=400, detail="URL parameter is required")
    
    # Ensure URL has a scheme
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    
    # Validate URL
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            raise HTTPException(status_code=400, detail="Invalid URL")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL")
    
    original_host = parsed.netloc
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
        
        content = response.text
        content_type = response.headers.get("content-type", "")
        
        # Only proxy HTML content
        if "text/html" not in content_type:
            return Response(
                content=content,
                status_code=response.status_code,
                headers=dict(response.headers),
            )
        
        # Remove X-Frame-Options, CSP headers that block iframes, and transfer encoding headers
        headers = dict(response.headers)
        headers.pop("x-frame-options", None)
        headers.pop("content-security-policy", None)
        headers.pop("content-security-policy-report-only", None)
        headers.pop("content-length", None)
        headers.pop("transfer-encoding", None)
        
        # Rewrite relative URLs to absolute URLs
        def replace_url(match):
            attr = match.group(1)  # href, src, etc.
            url_value = match.group(2)
            
            # Skip data: URLs, javascript:, #
            if url_value.startswith("data:") or url_value.startswith("javascript:") or url_value.startswith("#"):
                return match.group(0)
            
            # Skip absolute URLs
            if url_value.startswith("http://") or url_value.startswith("https://") or url_value.startswith("//"):
                return match.group(0)
            
            # Skip URLs that are just fragments
            if url_value.startswith("#"):
                return match.group(0)
            
            # Convert relative to absolute
            absolute_url = urljoin(url, url_value)
            return f'{attr}="{absolute_url}"'
        
        # Rewrite href and src attributes
        content = re.sub(r'(href|src)="([^"]*)"', replace_url, content)
        
        # Rewrite style attributes that contain URLs
        def replace_style_urls(style_value):
            def replace_url_in_style(match):
                url_content = match.group(1)
                return f"url({urljoin(url, url_content)})"
            return re.sub(r"url\(['\"]?([^'\")\s]*)['\"]?\)", replace_url_in_style, style_value)
        
        content = re.sub(r'style="([^"]*)"', lambda m: f'style="{replace_style_urls(m.group(1))}"', content)
        
        return Response(
            content=content,
            status_code=response.status_code,
            headers=headers,
        )
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch URL: {str(e)}")


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def format_datetime(dt):
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


@app.on_event("startup")
async def startup():
    async with async_engine.begin() as conn:
        await conn.run_sync(User.__table__.create, checkfirst=True)
        await conn.run_sync(Project.__table__.create, checkfirst=True)
        await conn.run_sync(Page.__table__.create, checkfirst=True)
        await conn.run_sync(ProjectShare.__table__.create, checkfirst=True)
        await conn.run_sync(Comment.__table__.create, checkfirst=True)
        await conn.run_sync(Line.__table__.create, checkfirst=True)


# User endpoints

@app.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user with same name exists
    result = await db.execute(
        text("SELECT * FROM users WHERE name = :name"),
        {"name": user.name}
    )
    existing = result.fetchone()
    if existing:
        return UserResponse(
            id=existing.id,
            name=existing.name,
            created_at=format_datetime(existing.created_at)
        )

    db_user = User(
        id=str(uuid.uuid4()),
        name=user.name,
        created_at=datetime.utcnow()
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return UserResponse(
        id=db_user.id,
        name=db_user.name,
        created_at=format_datetime(db_user.created_at)
    )


@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM users WHERE id = :id"),
        {"id": user_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=row.id,
        name=row.name,
        created_at=format_datetime(row.created_at)
    )


@app.get("/users/by-name/{name}", response_model=UserResponse)
async def get_user_by_name(name: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM users WHERE name = :name"),
        {"name": name}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=row.id,
        name=row.name,
        created_at=format_datetime(row.created_at)
    )


# Project endpoints

@app.post("/users/{user_id}/projects", response_model=ProjectResponse)
async def create_project(user_id: str, project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(
        text("SELECT * FROM users WHERE id = :id"),
        {"id": user_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="User not found")

    # Check if project with same title exists for this user
    result = await db.execute(
        text("SELECT * FROM projects WHERE user_id = :user_id AND title = :title"),
        {"user_id": user_id, "title": project.title}
    )
    existing = result.fetchone()
    if existing:
        # Update timestamp
        await db.execute(
            text("UPDATE projects SET updated_at = :now WHERE id = :id"),
            {"id": existing.id, "now": datetime.utcnow()}
        )
        await db.commit()
        return ProjectResponse(
            id=existing.id,
            user_id=existing.user_id,
            title=existing.title,
            created_at=format_datetime(existing.created_at),
            updated_at=format_datetime(datetime.utcnow())
        )

    db_project = Project(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=project.title,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)

    return ProjectResponse(
        id=db_project.id,
        user_id=db_project.user_id,
        title=db_project.title,
        created_at=format_datetime(db_project.created_at),
        updated_at=format_datetime(db_project.updated_at)
    )


@app.get("/users/{user_id}/projects", response_model=List[ProjectResponse])
async def get_user_projects(user_id: str, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(
        text("SELECT * FROM users WHERE id = :id"),
        {"id": user_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="User not found")

    # Get projects owned by user
    result = await db.execute(
        text("SELECT * FROM projects WHERE user_id = :user_id ORDER BY updated_at DESC"),
        {"user_id": user_id}
    )
    rows = result.fetchall()
    projects = []
    for row in rows:
        # Get comment count
        count_result = await db.execute(
            text("SELECT COUNT(*) FROM comments WHERE project_id = :project_id"),
            {"project_id": row.id}
        )
        count = count_result.scalar() or 0

        # Get owner name
        owner_result = await db.execute(
            text("SELECT name FROM users WHERE id = :id"),
            {"id": row.user_id}
        )
        owner_row = owner_result.fetchone()
        owner_name = owner_row.name if owner_row else "Unknown"

        projects.append(ProjectResponse(
            id=row.id,
            user_id=row.user_id,
            title=row.title,
            created_at=format_datetime(row.created_at),
            updated_at=format_datetime(row.updated_at),
            comment_count=count,
            owner_name=owner_name
        ))
    return projects


@app.get("/users/{user_id}/shared-projects", response_model=List[ProjectResponse])
async def get_shared_projects(user_id: str, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(
        text("SELECT * FROM users WHERE id = :id"),
        {"id": user_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="User not found")

    # Get projects shared with user
    result = await db.execute(
        text("""
            SELECT p.*, ps.created_at as share_created_at
            FROM projects p
            JOIN project_shares ps ON p.id = ps.project_id
            WHERE ps.shared_with_user_id = :user_id
            ORDER BY ps.created_at DESC
        """),
        {"user_id": user_id}
    )
    rows = result.fetchall()
    projects = []
    for row in rows:
        # Get comment count
        count_result = await db.execute(
            text("SELECT COUNT(*) FROM comments WHERE project_id = :project_id"),
            {"project_id": row.id}
        )
        count = count_result.scalar() or 0

        # Get owner name
        owner_result = await db.execute(
            text("SELECT name FROM users WHERE id = :id"),
            {"id": row.user_id}
        )
        owner_row = owner_result.fetchone()
        owner_name = owner_row.name if owner_row else "Unknown"

        projects.append(ProjectResponse(
            id=row.id,
            user_id=row.user_id,
            title=row.title,
            created_at=format_datetime(row.created_at),
            updated_at=format_datetime(row.updated_at),
            comment_count=count,
            owner_name=owner_name
        ))
    return projects


@app.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": project_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get comment count
    count_result = await db.execute(
        text("SELECT COUNT(*) FROM comments WHERE project_id = :project_id"),
        {"project_id": project_id}
    )
    count = count_result.scalar() or 0

    # Get owner name
    owner_result = await db.execute(
        text("SELECT name FROM users WHERE id = :id"),
        {"id": row.user_id}
    )
    owner_row = owner_result.fetchone()
    owner_name = owner_row.name if owner_row else "Unknown"

    return ProjectResponse(
        id=row.id,
        user_id=row.user_id,
        title=row.title,
        created_at=format_datetime(row.created_at),
        updated_at=format_datetime(row.updated_at),
        comment_count=count,
        owner_name=owner_name
    )


@app.delete("/projects/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    # Check if project exists
    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": project_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    # Delete all shares
    await db.execute(
        text("DELETE FROM project_shares WHERE project_id = :id"),
        {"id": project_id}
    )

    # Delete all comments
    await db.execute(
        text("DELETE FROM comments WHERE project_id = :id"),
        {"id": project_id}
    )

    # Delete project
    await db.execute(
        text("DELETE FROM projects WHERE id = :id"),
        {"id": project_id}
    )
    await db.commit()
    return {"deleted": True}


@app.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, update: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": project_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        set_clause = ", ".join([f"{k} = :{k}" for k in update_data])
        update_data["id"] = project_id
        await db.execute(
            text(f"UPDATE projects SET {set_clause} WHERE id = :id"),
            update_data
        )
        await db.commit()

    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": project_id}
    )
    row = result.fetchone()

    # Get comment count
    count_result = await db.execute(
        text("SELECT COUNT(*) FROM comments WHERE project_id = :project_id"),
        {"project_id": project_id}
    )
    count = count_result.scalar() or 0

    # Get owner name
    owner_result = await db.execute(
        text("SELECT name FROM users WHERE id = :id"),
        {"id": row.user_id}
    )
    owner_row = owner_result.fetchone()
    owner_name = owner_row.name if owner_row else "Unknown"

    return ProjectResponse(
        id=row.id,
        user_id=row.user_id,
        title=row.title,
        created_at=format_datetime(row.created_at),
        updated_at=format_datetime(row.updated_at),
        comment_count=count,
        owner_name=owner_name
    )


# Share endpoints

@app.post("/projects/{project_id}/share", response_model=ShareResponse)
async def share_project(project_id: str, request: ShareRequest, db: AsyncSession = Depends(get_db)):
    # Check if project exists
    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": project_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    # Find user to share with
    result = await db.execute(
        text("SELECT * FROM users WHERE name = :name"),
        {"name": request.username}
    )
    target_user = result.fetchone()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user_id = target_user.id

    # Check if already shared
    result = await db.execute(
        text("SELECT * FROM project_shares WHERE project_id = :project_id AND shared_with_user_id = :user_id"),
        {"project_id": project_id, "user_id": target_user_id}
    )
    if result.fetchone():
        raise HTTPException(status_code=400, detail="Project already shared with this user")

    db_share = ProjectShare(
        id=str(uuid.uuid4()),
        project_id=project_id,
        shared_with_user_id=target_user_id,
        created_at=datetime.utcnow()
    )
    db.add(db_share)
    await db.commit()
    await db.refresh(db_share)

    return ShareResponse(
        id=db_share.id,
        project_id=db_share.project_id,
        shared_with_user_id=db_share.shared_with_user_id,
        created_at=format_datetime(db_share.created_at)
    )


# Page endpoints

@app.get("/projects/{project_id}/pages", response_model=List[PageResponse])
async def get_pages(project_id: str, db: AsyncSession = Depends(get_db)):
    # Check if project exists
    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": project_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        text("SELECT * FROM pages WHERE project_id = :project_id ORDER BY `order` ASC"),
        {"project_id": project_id}
    )
    rows = result.fetchall()
    return [PageResponse(**row._mapping) for row in rows]


@app.get("/projects/{project_id}/pages/{page_id}", response_model=PageResponse)
async def get_page(project_id: str, page_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM pages WHERE id = :id AND project_id = :project_id"),
        {"id": page_id, "project_id": project_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Page not found")
    return PageResponse(**row._mapping)


@app.post("/projects/{project_id}/pages", response_model=PageResponse)
async def create_page(project_id: str, page: PageCreate, db: AsyncSession = Depends(get_db)):
    # Check if project exists
    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": project_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    # Get the next order number
    result = await db.execute(
        text("SELECT COALESCE(MAX(`order`), -1) + 1 as next_order FROM pages WHERE project_id = :project_id"),
        {"project_id": project_id}
    )
    next_order = result.fetchone().next_order

    # Normalize URL
    url = page.url
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url

    page_id = str(uuid.uuid4())
    page_title = page.title or f"Page {next_order + 1}"
    now = datetime.utcnow()

    # Insert using text() to avoid async issues
    await db.execute(
        text("INSERT INTO pages (id, project_id, url, title, `order`, created_at) VALUES (:id, :project_id, :url, :title, :order, :created_at)"),
        {"id": page_id, "project_id": project_id, "url": url, "title": page_title, "order": next_order, "created_at": now}
    )
    await db.commit()

    # Update project timestamp
    await db.execute(
        text("UPDATE projects SET updated_at = :now WHERE id = :id"),
        {"id": project_id, "now": now}
    )
    await db.commit()

    return PageResponse(
        id=page_id,
        project_id=project_id,
        url=url,
        title=page_title,
        order=next_order,
        created_at=format_datetime(now)
    )


@app.patch("/projects/{project_id}/pages/{page_id}", response_model=PageResponse)
async def update_page(project_id: str, page_id: str, update: PageUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM pages WHERE id = :id AND project_id = :project_id"),
        {"id": page_id, "project_id": project_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Page not found")

    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        # Normalize URL if provided
        if 'url' in update_data:
            url = update_data['url']
            if url and not url.startswith('http://') and not url.startswith('https://'):
                update_data['url'] = 'https://' + url

        set_clause = ", ".join([f"{k} = :{k}" for k in update_data])
        update_data["id"] = page_id
        await db.execute(
            text(f"UPDATE pages SET {set_clause} WHERE id = :id"),
            update_data
        )
        await db.commit()

    result = await db.execute(
        text("SELECT * FROM pages WHERE id = :id"),
        {"id": page_id}
    )
    row = result.fetchone()
    return PageResponse(**row._mapping)


@app.delete("/projects/{project_id}/pages/{page_id}")
async def delete_page(project_id: str, page_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM pages WHERE id = :id AND project_id = :project_id"),
        {"id": page_id, "project_id": project_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Page not found")

    # Delete all comments for this page
    await db.execute(
        text("DELETE FROM comments WHERE project_id = :project_id AND page_id = :page_id"),
        {"project_id": project_id, "page_id": page_id}
    )

    # Delete all lines for this page
    await db.execute(
        text("DELETE FROM lines WHERE project_id = :project_id AND page_id = :page_id"),
        {"project_id": project_id, "page_id": page_id}
    )

    # Delete the page
    await db.execute(
        text("DELETE FROM pages WHERE id = :id"),
        {"id": page_id}
    )
    await db.commit()
    return {"deleted": True}


# Comment endpoints

@app.get("/projects/{project_id}/pages/{page_id}/comments", response_model=List[CommentResponse])
async def get_comments(project_id: str, page_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM comments WHERE project_id = :project_id AND page_id = :page_id ORDER BY created_at DESC"),
        {"project_id": project_id, "page_id": page_id}
    )
    rows = result.fetchall()
    return [CommentResponse(**row._mapping) for row in rows]


@app.post("/projects/{project_id}/comments", response_model=CommentResponse)
async def create_comment(project_id: str, comment: CommentCreate, db: AsyncSession = Depends(get_db)):
    # Check if project exists
    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": project_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if page exists and belongs to project
    result = await db.execute(
        text("SELECT * FROM pages WHERE id = :id AND project_id = :project_id"),
        {"id": comment.page_id, "project_id": project_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Page not found")

    db_comment = Comment(
        id=str(uuid.uuid4()),
        project_id=project_id,
        page_id=comment.page_id,
        x=comment.x,
        y=comment.y,
        text=comment.text,
        author=comment.author,
        resolved=False,
        created_at=datetime.utcnow()
    )
    db.add(db_comment)

    # Update project timestamp
    await db.execute(
        text("UPDATE projects SET updated_at = :now WHERE id = :id"),
        {"id": project_id, "now": datetime.utcnow()}
    )

    await db.commit()
    await db.refresh(db_comment)
    return CommentResponse(
        id=db_comment.id,
        project_id=db_comment.project_id,
        page_id=db_comment.page_id,
        x=db_comment.x,
        y=db_comment.y,
        text=db_comment.text,
        author=db_comment.author,
        resolved=db_comment.resolved,
        created_at=format_datetime(db_comment.created_at)
    )


@app.patch("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(comment_id: str, update: CommentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM comments WHERE id = :id"),
        {"id": comment_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Comment not found")

    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        set_clause = ", ".join([f"{k} = :{k}" for k in update_data])
        update_data["id"] = comment_id
        await db.execute(
            text(f"UPDATE comments SET {set_clause} WHERE id = :id"),
            update_data
        )
        await db.commit()

    result = await db.execute(
        text("SELECT * FROM comments WHERE id = :id"),
        {"id": comment_id}
    )
    row = result.fetchone()
    return CommentResponse(**row._mapping)


@app.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM comments WHERE id = :id"),
        {"id": comment_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Comment not found")

    await db.execute(
        text("DELETE FROM comments WHERE id = :id"),
        {"id": comment_id}
    )
    await db.commit()
    return {"deleted": True}


# Line endpoints

@app.get("/projects/{project_id}/pages/{page_id}/lines", response_model=List[LineResponse])
async def get_lines(project_id: str, page_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM lines WHERE project_id = :project_id AND page_id = :page_id ORDER BY created_at ASC"),
        {"project_id": project_id, "page_id": page_id}
    )
    rows = result.fetchall()
    return [LineResponse(**row._mapping) for row in rows]


@app.post("/projects/{project_id}/lines", response_model=LineResponse)
async def create_line(project_id: str, line: LineCreate, db: AsyncSession = Depends(get_db)):
    # Check if project exists
    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": project_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if page exists and belongs to project
    result = await db.execute(
        text("SELECT * FROM pages WHERE id = :id AND project_id = :project_id"),
        {"id": line.page_id, "project_id": project_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Page not found")

    db_line = Line(
        id=str(uuid.uuid4()),
        project_id=project_id,
        page_id=line.page_id,
        x1=line.x1,
        y1=line.y1,
        x2=line.x2,
        y2=line.y2,
        color=line.color,
        author=line.author,
        created_at=datetime.utcnow()
    )
    db.add(db_line)
    await db.commit()
    await db.refresh(db_line)
    return LineResponse(
        id=db_line.id,
        project_id=db_line.project_id,
        page_id=db_line.page_id,
        x1=db_line.x1,
        y1=db_line.y1,
        x2=db_line.x2,
        y2=db_line.y2,
        color=db_line.color,
        author=db_line.author,
        created_at=format_datetime(db_line.created_at)
    )


@app.patch("/lines/{line_id}", response_model=LineResponse)
async def update_line(line_id: str, update: LineUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM lines WHERE id = :id"),
        {"id": line_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Line not found")

    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        set_clause = ", ".join([f"{k} = :{k}" for k in update_data])
        update_data["id"] = line_id
        await db.execute(
            text(f"UPDATE lines SET {set_clause} WHERE id = :id"),
            update_data
        )
        await db.commit()

    result = await db.execute(
        text("SELECT * FROM lines WHERE id = :id"),
        {"id": line_id}
    )
    row = result.fetchone()
    return LineResponse(**row._mapping)


@app.delete("/lines/{line_id}")
async def delete_line(line_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM lines WHERE id = :id"),
        {"id": line_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Line not found")

    await db.execute(
        text("DELETE FROM lines WHERE id = :id"),
        {"id": line_id}
    )
    await db.commit()
    return {"deleted": True}

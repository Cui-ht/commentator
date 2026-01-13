# Re-export for backwards compatibility
from db_models import (
    User, Project, ProjectShare, Comment, Line, Page, Base
)
from schemas import (
    UserCreate, UserResponse,
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ShareRequest, ShareResponse,
    CommentCreate, CommentUpdate, CommentResponse,
    LineCreate, LineUpdate, LineResponse,
    PageCreate, PageUpdate, PageResponse,
)

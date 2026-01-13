from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# User schemas
class UserCreate(BaseModel):
    name: str


class UserResponse(BaseModel):
    id: str
    name: str
    created_at: str


# Project schemas
class ProjectCreate(BaseModel):
    title: str


class ProjectUpdate(BaseModel):
    title: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    title: Optional[str]
    created_at: str
    updated_at: str
    comment_count: int = 0
    page_count: int = 0
    owner_name: Optional[str] = None


# Page schemas
class PageCreate(BaseModel):
    url: str
    title: Optional[str] = None


class PageUpdate(BaseModel):
    url: Optional[str] = None
    title: Optional[str] = None
    order: Optional[int] = None


class PageResponse(BaseModel):
    id: str
    project_id: str
    url: str
    title: Optional[str]
    order: int
    created_at: str


# Share schemas
class ShareRequest(BaseModel):
    username: str


class ShareResponse(BaseModel):
    id: str
    project_id: str
    shared_with_user_id: str
    created_at: str


# Comment schemas
class CommentCreate(BaseModel):
    page_id: str
    x: float
    y: float
    text: str
    author: str


class CommentUpdate(BaseModel):
    text: Optional[str] = None
    resolved: Optional[bool] = None


class CommentResponse(BaseModel):
    id: str
    project_id: str
    page_id: str
    x: float
    y: float
    text: str
    author: str
    resolved: bool
    created_at: str


# Line schemas
class LineCreate(BaseModel):
    page_id: str
    x1: float
    y1: float
    x2: float
    y2: float
    color: str
    author: str


class LineUpdate(BaseModel):
    x1: Optional[float] = None
    y1: Optional[float] = None
    x2: Optional[float] = None
    y2: Optional[float] = None
    color: Optional[str] = None


class LineResponse(BaseModel):
    id: str
    project_id: str
    page_id: str
    x1: float
    y1: float
    x2: float
    y2: float
    color: str
    author: str
    created_at: str

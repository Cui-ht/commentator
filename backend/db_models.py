from sqlalchemy import Column, String, Float, Boolean, Text, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False)


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)


class Page(Base):
    __tablename__ = "pages"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), nullable=False, index=True)
    url = Column(String(2048), nullable=False)
    title = Column(String(255), nullable=True)
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False)


class ProjectShare(Base):
    __tablename__ = "project_shares"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), nullable=False, index=True)
    shared_with_user_id = Column(String(36), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False)


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(255), nullable=False, index=True)
    page_id = Column(String(36), nullable=False, index=True)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    text = Column(Text, nullable=False)
    author = Column(String(255), nullable=False)
    resolved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, nullable=False)


class Line(Base):
    __tablename__ = "lines"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), nullable=False, index=True)
    page_id = Column(String(36), nullable=False, index=True)
    x1 = Column(Float, nullable=False)
    y1 = Column(Float, nullable=False)
    x2 = Column(Float, nullable=False)
    y2 = Column(Float, nullable=False)
    color = Column(String(20), nullable=False)
    author = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False)

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from blog.models import Post, Category, Comment

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def author(db):
    return User.objects.create_user(
        username="alice", password="s3curePass!", role=User.Role.AUTHOR,
    )


@pytest.fixture
def other_author(db):
    return User.objects.create_user(
        username="bob", password="s3curePass!", role=User.Role.AUTHOR,
    )


@pytest.fixture
def admin(db):
    return User.objects.create_superuser(
        username="root", password="s3curePass!",
    )


@pytest.fixture
def category(db):
    return Category.objects.create(name="python")


@pytest.fixture
def draft(author):
    return Post.objects.create(
        title="Draft Post", body="x" * 20, author=author,
        status=Post.Status.DRAFT,
    )


@pytest.fixture
def published(author, category):
    p = Post.objects.create(
        title="Published Post", body="x" * 20, author=author,
        status=Post.Status.PUBLISHED, published_at=timezone.now(),
    )
    p.categories.add(category)
    return p


@pytest.fixture
def comment(published, other_author):
    return Comment.objects.create(
        post=published, author=other_author, body="nice post",
    )
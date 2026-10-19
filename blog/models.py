# blog/models.py
import uuid
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinLengthValidator, MaxLengthValidator
from django.db import models
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify


# ---------------------------------------------------------------------------
# Users & roles
# ---------------------------------------------------------------------------
class User(AbstractUser):
    """
    Custom user because the assignment requires author/admin roles.
    Using a single table + role enum keeps auth simple for the MVP;
    group-based permissions can be layered on later if needed.
    """

    class Role(models.TextChoices):
        AUTHOR = "AUTHOR", "Author"
        ADMIN = "ADMIN", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.AUTHOR,
        help_text="Admins can moderate all content; authors manage their own posts.",
    )
    bio = models.TextField(blank=True, max_length=500)
    # avatar handled later by a FileField / S3 (planned — see engineering decisions)
    REQUIRED_FIELDS = []
    class Meta:
        indexes = [models.Index(fields=["role"])]

    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN or self.is_superuser

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"


# ---------------------------------------------------------------------------
# Taxonomy
# ---------------------------------------------------------------------------
class Category(models.Model):
    """
    Flat categories (no nesting) — matches MVP scope. Nesting can be added
    later with a self-FK (parent) without breaking existing rows.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


# ---------------------------------------------------------------------------
# Posts
# ---------------------------------------------------------------------------
class Post(models.Model):
    """
    Core content entity. Draft -> Published lifecycle via `status`.
    Slug is the public identifier (used in API routes and URLs).
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, validators=[MinLengthValidator(3)])
    slug = models.SlugField(max_length=240, unique=True, db_index=True)
    body = models.TextField(validators=[MinLengthValidator(10)],max_length=1000)
    # excerpt = models.CharField(max_length=300, blank=True)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,          # never lose posts if a user is deleted
        related_name="posts",
    )
    categories = models.ManyToManyField(
        Category,
        related_name="posts",
        blank=True,
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # lightweight denormalized counters — updated in service layer, not triggers

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "-published_at"]),
            models.Index(fields=["author", "status"]),
        ]
        

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:200] or "post"
            slug = base
            n = 1
            # ensure uniqueness without a DB race in dev; production would retry on IntegrityError
            while Post.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                n += 1
                slug = f"{base}-{n}"
            self.slug = slug
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def is_published(self) -> bool:
        return self.status == self.Status.PUBLISHED

    def get_absolute_url(self) -> str:
        return reverse("post-detail", kwargs={"slug": self.slug})

    def __str__(self) -> str:
        return self.title


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------
class Comment(models.Model):
    """
    One level of replies (parent can itself be a top-level comment).
    Visitor can read; authenticated user can write (permission enforced in view).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,           # deleting a post removes its comments
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,           # comments may vanish with the user
        related_name="comments",
    )
    # parent = models.ForeignKey(
    #     "self",
    #     null=True,
    #     blank=True,
    #     on_delete=models.CASCADE,
    #     related_name="replies",
    # )
    body = models.TextField(max_length=500)
    is_visible = models.BooleanField(
        default=True,
        help_text="Admins can hide comments without deleting them.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["post", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"Comment by {self.author_id} on {self.post_id}"
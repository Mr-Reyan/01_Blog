
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, Category, Post, Comment

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "role", "bio", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("username", "bio")

    # Add `role` and `bio` to the edit form
    fieldsets = UserAdmin.fieldsets + (
        ("Custom Fields", {"fields": ("role", "bio")}),
    )
    # Add `role` to the create form (bio optional there)
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Custom Fields", {"fields": ("role",)}),
    )

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}  # live-updates slug as you type name

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "status", "published_at", "created_at")
    list_filter = ("status", "categories")
    search_fields = ("title", "body")
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("categories",)  # nicer M2M widget for categories
    readonly_fields = ("id", "created_at", "updated_at")

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "author", "is_visible", "created_at")
    list_filter = ("is_visible",)
    search_fields = ("body",)
    readonly_fields = ("id", "created_at", "updated_at")
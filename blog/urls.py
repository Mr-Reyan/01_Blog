# blog/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import auth, post, comment, category

# ---------- Auth (function/class views, not a router) ----------
auth_patterns = [
    path("register/", auth.RegisterView.as_view(), name="auth-register"),
    path("login/", auth.LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", auth.MeView.as_view(), name="auth-me"),
    path("logout/",auth.LogoutView.as_view(), name="auth-logout"),
]

# ---------- Content (routers) ----------
router = DefaultRouter()
router.register("posts", post.PostViewSet, basename="post")
router.register("categories", category.CategoryViewSet, basename="category")

# ---------- Nested comments (explicit paths, not router) ----------
comment_patterns = [
    path(
        "posts/<slug:post_slug>/comments/",
        comment.CommentListCreateView.as_view(),
        name="post-comments",
    ),
    path(
        "posts/<slug:post_slug>/comments/<uuid:pk>/",
        comment.CommentDetailView.as_view(),
        name="post-comment-detail",
    ),
]

urlpatterns = [
    path("auth/", include(auth_patterns)),
    path("", include(router.urls)),
    path("", include(comment_patterns)),
]
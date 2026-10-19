# blog/views/post.py
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import SearchFilter, OrderingFilter

from ..models import Post
from ..permissions import IsOwnerOrAdmin
from ..serializers import PostSerializer
from ..services import visible_posts_for

class PostViewSet(ModelViewSet):
    serializer_class = PostSerializer
    lookup_field = "slug"
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["title", "body"]
    ordering_fields = ["published_at", "created_at", "title"]
    ordering = ["-published_at"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "create":
            return [IsAuthenticated()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = visible_posts_for(self.request.user)
        qs = qs.select_related("author").prefetch_related("categories")
        if self.action == "list" and self.request.query_params.get("mine") == "true":
            if not self.request.user.is_authenticated:
                return qs.none()
            qs = qs.filter(author=self.request.user)
        if cat := self.request.query_params.get("category"):
            qs = qs.filter(categories__slug=cat)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, status=Post.Status.DRAFT)

    @action(
        detail=True,
        methods=["post"],
        url_path="publish",
        permission_classes=[IsAuthenticated, IsOwnerOrAdmin],
    )
    def publish(self, request, slug=None):
        post = self.get_object()
        if post.status == Post.Status.PUBLISHED:
            return Response(
                {"detail": "Post is already published."},
                status=status.HTTP_409_CONFLICT,
            )
        post.status = Post.Status.PUBLISHED
        post.published_at = timezone.now()
        post.save(update_fields=["status", "published_at", "updated_at"])
        return Response(
            {"id": str(post.id), "slug": post.slug,
             "status": post.status, "published_at": post.published_at},
            status=status.HTTP_200_OK,
        )
from rest_framework.generics import GenericAPIView, DestroyAPIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework import status
from rest_framework.response import Response

from django.shortcuts import get_object_or_404
from ..permissions import IsOwnerOrAdmin
from ..models import Comment, Post
from ..serializers import CommentSerializer
from ..services import visible_posts_for

def _get_visible_post(request, post_slug):
    return get_object_or_404(visible_posts_for(request.user), slug=post_slug)

class CommentListCreateView(GenericAPIView):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]   

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Comment.objects.none()
        post = _get_visible_post(self.request, self.kwargs["post_slug"])
        return (
            Comment.objects
            .filter(post=post, is_visible=True)
            .select_related("author")
        )

    def get(self, request, post_slug):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        
        return Response(serializer.data)

    def post(self, request, post_slug):
        post = _get_visible_post(request, post_slug)
        if post.status != Post.Status.PUBLISHED and post.author_id != request.user.id and request.user.role != "ADMIN":
            return Response(
                {"detail": "Comments are disabled on unpublished posts."},
                status=status.HTTP_409_CONFLICT,
            )
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request, "post": post},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user, post=post)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class CommentDetailView(DestroyAPIView):
    """
    DELETE /api/v1/posts/{slug}/comments/{id}/
    """
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Comment.objects.none()
        post = _get_visible_post(self.request, self.kwargs["post_slug"])
        return Comment.objects.filter(post=post)
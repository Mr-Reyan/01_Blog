from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import User

class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        return can_edit_post(request.user, obj)

def can_edit_post(user, post):
    return user.is_authenticated and (user.is_admin() or post.author_id == user.id)
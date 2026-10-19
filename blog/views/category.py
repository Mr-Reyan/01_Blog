from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..models import Category
from ..serializers import CategorySerializer

class IsAdminRole(IsAuthenticated):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and request.user.is_admin())

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in ("list","retrieve"):
            return [AllowAny()]
        return [IsAdminRole()]
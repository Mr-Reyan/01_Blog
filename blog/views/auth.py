from rest_framework import status
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..serializers import RegisterSerializer, UserSerializer
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers


@extend_schema(request=RegisterSerializer, responses={201: RegisterSerializer})
class RegisterView(APIView):
    """
    POST /api/v1/auth/register/
    Public. Creates an AUTHOR account. ADMIN role is never assignable here.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

@extend_schema(responses=UserSerializer)
class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response(UserSerializer(request.user).data)

class LoginView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"
    permission_classes = [AllowAny]
    authentication_classes = []


@extend_schema(
    request=inline_serializer("LogoutRequest", {"refresh": serializers.CharField()}),
    responses={205: None},
)
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            RefreshToken(request.data["refresh"]).blacklist()
        except (KeyError, TokenError):
            return Response({"refresh": ["Invalid."]}, status=400)
        return Response(status=205)
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

User = get_user_model()
URL_REGISTER = "/api/v1/auth/register/"
URL_LOGIN    = "/api/v1/auth/login/"
URL_REFRESH  = "/api/v1/auth/refresh/"
URL_ME       = "/api/v1/auth/me/"
pytestmark = pytest.mark.django_db


def _login(api, username, password):
    return api.post(URL_LOGIN, {"username": username, "password": password}, format="json")


# ---------------- RegisterView ----------------

def test_register_success(api):
    r = api.post(URL_REGISTER, {"username": "newbie", "password": "s3curePass!"}, format="json")
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data["username"] == "newbie"
    assert r.data["role"] == "AUTHOR"
    assert "password" not in r.data
    assert User.objects.get(username="newbie").check_password("s3curePass!")


def test_register_missing_username(api):
    r = api.post(URL_REGISTER, {"password": "s3curePass!"}, format="json")
    assert r.status_code == 400 and "username" in r.data


def test_register_missing_password(api):
    r = api.post(URL_REGISTER, {"username": "newbie"}, format="json")
    assert r.status_code == 400 and "password" in r.data


def test_register_blank_username(api):
    r = api.post(URL_REGISTER, {"username": "   ", "password": "s3curePass!"}, format="json")
    assert r.status_code == 400 and "username" in r.data


def test_register_short_password(api):
    r = api.post(URL_REGISTER, {"username": "newbie", "password": "short"}, format="json")
    assert r.status_code == 400 and "password" in r.data


def test_register_duplicate_username(api, author):
    r = api.post(URL_REGISTER, {"username": "alice", "password": "s3curePass!"}, format="json")
    assert r.status_code == 400 and "username" in r.data


def test_register_case_insensitive_duplicate(api, author):
    """Fails unless validate_username uses __iexact."""
    r = api.post(URL_REGISTER, {"username": "Alice", "password": "s3curePass!"}, format="json")
    assert r.status_code == 400 and "username" in r.data


def test_register_cannot_self_assign_admin(api):
    r = api.post(
        URL_REGISTER,
        {"username": "mallory", "password": "s3curePass!", "role": "ADMIN"},
        format="json",
    )
    assert r.status_code == 201
    assert User.objects.get(username="mallory").role == User.Role.AUTHOR


# ---------------- LoginView (TokenObtainPairView) ----------------

def test_login_success(api, author):
    r = _login(api, "alice", "s3curePass!")
    assert r.status_code == 200
    assert "access" in r.data and "refresh" in r.data


def test_login_wrong_password_401(api, author):
    r = _login(api, "alice", "wrong")
    assert r.status_code == 401 and "detail" in r.data


def test_login_unknown_user_401(api):
    assert _login(api, "nobody", "whatever").status_code == 401


def test_login_inactive_user_401(api, author):
    author.is_active = False
    author.save()
    assert _login(api, "alice", "s3curePass!").status_code == 401


# ---------------- TokenRefreshView ----------------

def test_refresh_success(api, author):
    refresh = _login(api, "alice", "s3curePass!").data["refresh"]
    r = api.post(URL_REFRESH, {"refresh": refresh}, format="json")
    assert r.status_code == 200 and "access" in r.data


def test_refresh_invalid_token_401(api):
    r = api.post(URL_REFRESH, {"refresh": "garbage"}, format="json")
    assert r.status_code == 401


def test_refresh_is_public(api, author):
    """Refresh must not require an access token (chicken-and-egg)."""
    refresh = _login(api, "alice", "s3curePass!").data["refresh"]
    r = api.post(URL_REFRESH, {"refresh": refresh}, format="json")
    assert r.status_code == 200   # no Authorization header sent


# ---------------- MeView ----------------

def test_me_requires_auth(api):
    assert api.get(URL_ME).status_code == 401


def test_me_returns_current_user(api, author):
    access = _login(api, "alice", "s3curePass!").data["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    r = api.get(URL_ME)
    assert r.status_code == 200
    assert r.data["username"] == "alice"
    assert r.data["role"] == "AUTHOR"
    assert "password" not in r.data


def test_me_invalid_token_401(api):
    api.credentials(HTTP_AUTHORIZATION="Bearer garbage")
    assert api.get(URL_ME).status_code == 401
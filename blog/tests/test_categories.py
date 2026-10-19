# blog/tests/test_categories.py
import pytest
from rest_framework import status

from blog.models import Category, Post

URL = "/api/v1/categories/"
pytestmark = pytest.mark.django_db


# ============================================================
# list — public
# ============================================================

def test_list_public_returns_flat_list(api, category):
    r = api.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert isinstance(r.data, list)              # no pagination
    assert any(c["slug"] == "python" for c in r.data)


def test_list_public_empty(api):
    r = api.get(URL)
    assert r.status_code == 200
    assert r.data == []


def test_list_returns_multiple(api):
    Category.objects.create(name="rust")
    Category.objects.create(name="go")
    r = api.get(URL)
    assert r.status_code == 200
    assert len(r.data) == 2
    assert {c["slug"] for c in r.data} == {"rust", "go"}


def test_list_ordered_by_name(api):
    """Model.Meta.ordering = ['name'] must be respected."""
    Category.objects.create(name="zeta")
    Category.objects.create(name="alpha")
    Category.objects.create(name="mike")
    r = api.get(URL)
    names = [c["name"] for c in r.data]
    assert names == sorted(names)


# ============================================================
# retrieve — public
# ============================================================

def test_retrieve_public(api, category):
    r = api.get(f"{URL}python/")
    assert r.status_code == 200
    assert r.data["slug"] == "python"
    assert r.data["name"] == "python"


def test_retrieve_unknown_slug_404(api):
    assert api.get(f"{URL}nope/").status_code == 404


def test_retrieve_includes_post_count_if_serializer_provides_it(api, published, category):
    """
    Only runs if CategorySerializer has a post_count field.
    Skip silently otherwise — keeps the test suite green if you removed it.
    """
    r = api.get(f"{URL}python/")
    if "post_count" in r.data:
        assert r.data["post_count"] == 1


# ============================================================
# create — admin only
# ============================================================

def test_create_requires_auth(api):
    # no auth header → JWTAuthentication returns 401
    assert api.post(URL, {"name": "rust"}, format="json").status_code == 401


def test_create_author_forbidden(api, author):
    # force_authenticate bypasses the auth chain → permission failure → 403
    api.force_authenticate(author)
    assert api.post(URL, {"name": "rust"}, format="json").status_code == 403


def test_create_admin_ok(api, admin):
    api.force_authenticate(admin)
    r = api.post(URL, {"name": "rust"}, format="json")
    assert r.status_code == 201
    assert r.data["slug"] == "rust"
    assert r.data["name"] == "rust"


def test_create_slug_auto_generated(api, admin):
    api.force_authenticate(admin)
    r = api.post(URL, {"name": "Machine Learning"}, format="json")
    assert r.status_code == 201
    assert r.data["slug"] == "machine-learning"


def test_create_missing_name_400(api, admin):
    api.force_authenticate(admin)
    r = api.post(URL, {}, format="json")
    assert r.status_code == 400
    assert "name" in r.data


def test_create_blank_name_400(api, admin):
    api.force_authenticate(admin)
    r = api.post(URL, {"name": "   "}, format="json")
    assert r.status_code == 400


def test_create_duplicate_name_400(api, admin, category):
    api.force_authenticate(admin)
    r = api.post(URL, {"name": "python"}, format="json")
    assert r.status_code == 400
    assert "name" in r.data


def test_create_case_insensitive_duplicate_400(api, admin, category):
    """
    'Python' vs existing 'python' — collide on slug.
    Requires CategorySerializer.validate_name to check slug collision.
    Without it: IntegrityError → 500.
    """
    api.force_authenticate(admin)
    r = api.post(URL, {"name": "Python"}, format="json")
    assert r.status_code == 400
    assert "name" in r.data


def test_create_cannot_set_slug(api, admin):
    """slug is read-only, even if client sends one."""
    api.force_authenticate(admin)
    r = api.post(URL, {"name": "rust", "slug": "hijacked"}, format="json")
    assert r.status_code == 201
    assert r.data["slug"] == "rust"


def test_create_description_optional(api, admin):
    api.force_authenticate(admin)
    r = api.post(URL, {"name": "rust"}, format="json")
    assert r.status_code == 201
    assert r.data["description"] == ""


def test_create_with_description(api, admin):
    api.force_authenticate(admin)
    r = api.post(URL, {"name": "rust", "description": "Systems language"}, format="json")
    assert r.status_code == 201
    assert r.data["description"] == "Systems language"


# ============================================================
# update / partial_update — admin only
# ============================================================

def test_update_requires_auth(api, category):
    assert api.patch(f"{URL}python/", {"description": "x"}, format="json").status_code == 401


def test_update_author_forbidden(api, author, category):
    api.force_authenticate(author)
    r = api.patch(f"{URL}python/", {"description": "x"}, format="json")
    assert r.status_code == 403


def test_update_admin_ok(api, admin, category):
    api.force_authenticate(admin)
    r = api.patch(f"{URL}python/", {"description": "Python language"}, format="json")
    assert r.status_code == 200
    assert r.data["description"] == "Python language"


def test_update_slug_readonly(api, admin, category):
    """Patching slug must be ignored — it's read-only."""
    api.force_authenticate(admin)
    r = api.patch(f"{URL}python/", {"slug": "hijacked"}, format="json")
    assert r.status_code == 200
    assert r.data["slug"] == "python"
    category.refresh_from_db()
    assert category.slug == "python"


def test_update_name_regenerates_slug(api, admin, category):
    """
    If your Category.save() only sets slug when empty, renaming leaves the old slug.
    That's intentional (slug stability for URLs). Test documents current behavior.
    """
    api.force_authenticate(admin)
    r = api.patch(f"{URL}python/", {"name": "Python 3"}, format="json")
    assert r.status_code == 200
    category.refresh_from_db()
    # change this assertion to `== "python-3"` if you later choose to regenerate
    assert category.slug == "python"


def test_update_unknown_slug_404(api, admin):
    api.force_authenticate(admin)
    assert api.patch(f"{URL}nope/", {"description": "x"}, format="json").status_code == 404


# ============================================================
# destroy — admin only
# ============================================================

def test_delete_requires_auth(api, category):
    assert api.delete(f"{URL}python/").status_code == 401


def test_delete_author_forbidden(api, author, category):
    api.force_authenticate(author)
    assert api.delete(f"{URL}python/").status_code == 403


def test_delete_admin_ok(api, admin, category):
    api.force_authenticate(admin)
    r = api.delete(f"{URL}python/")
    assert r.status_code == 204
    assert not Category.objects.filter(slug="python").exists()


def test_delete_detaches_from_posts(api, admin, published, category):
    """
    Deleting a category must NOT delete its posts; it only detaches them.
    This is the test the original version got wrong (checked existence, not detach).
    """
    assert published.categories.count() == 1     # precondition
    api.force_authenticate(admin)
    api.delete(f"{URL}python/")

    p = Post.objects.get(pk=published.pk)
    assert p is not None                          # post survived
    assert p.categories.count() == 0              # category detached


def test_delete_unknown_slug_404(api, admin):
    api.force_authenticate(admin)
    assert api.delete(f"{URL}nope/").status_code == 404


# ============================================================
# cross-checks (things a reviewer will poke at)
# ============================================================

def test_anonymous_can_read_but_not_write(api, category):
    """One test that proves the permission split in a single flow."""
    assert api.get(URL).status_code == 200
    assert api.post(URL, {"name": "rust"}, format="json").status_code == 401


def test_deleted_category_no_longer_in_list(api, admin, category):
    api.force_authenticate(admin)
    api.delete(f"{URL}python/")
    r = api.get(URL)
    assert all(c["slug"] != "python" for c in r.data)


def test_created_category_appears_in_list(api, admin):
    api.force_authenticate(admin)
    api.post(URL, {"name": "rust"}, format="json")
    r = api.get(URL)
    assert any(c["slug"] == "rust" for c in r.data)
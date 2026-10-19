from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.contrib.auth.validators import UnicodeUsernameValidator

from django.utils.text import slugify
from .models import Post, Category, Comment
User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(
        max_length=150,
        trim_whitespace=True,
        validators=[UnicodeUsernameValidator()]
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            role=User.Role.AUTHOR,
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "role", "bio", "date_joined"]
        read_only_fields = fields

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"
        read_only_fields = ["id", "slug"]
    def validate_name(self, value):
        slug = slugify(value)
        qs = Category.objects.filter(slug=slug)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A category with a similar name already exists."
            )
        return value

class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)  # Nest the user data

    class Meta:
        model = Post
        fields = "__all__"
        read_only_fields = ["id", "slug", "author","status", "published_at", "created_at", "updated_at"]
    def to_representation(self, instance):

        data = super().to_representation(instance)
        data["categories"] = CategorySerializer(instance.categories.all(), many=True).data
        return data


class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username',read_only=True)
    class Meta:
        model = Comment
        fields = ["id", "body", "author", "author_username", "is_visible", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "author_username", "is_visible", "created_at", "updated_at"]
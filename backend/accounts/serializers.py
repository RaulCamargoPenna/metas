from rest_framework import serializers

from accounts.models import CustomUser, Notifications


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['username', 'first_name', 'last_name', 'email', 'image', 'bio']
        model = CustomUser
        
class RegisterUserSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['username', 'first_name', 'last_name', 'email', 'password']
        model = CustomUser
        
    def create(self, validated_data):
        password = validated_data.pop("password")
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        
        return user
    
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    
class NotificationsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notifications
        fields = "__all__"
        read_only_fields = ['created_at', 'user']
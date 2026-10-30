from rest_framework import serializers

from accounts.models import CustomUser


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['username', 'first_name', 'last_name', 'email']
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
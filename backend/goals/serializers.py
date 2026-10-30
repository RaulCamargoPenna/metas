from rest_framework import serializers

from .models import Goals, Tasks


class GoalsSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        fields = '__all__'
        model = Goals
        read_only_fields = ['user']

class TasksSerializer(serializers.ModelSerializer):
    class Meta:
        fields = '__all__'
        model = Tasks
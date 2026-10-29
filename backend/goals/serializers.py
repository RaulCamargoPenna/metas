from rest_framework import serializers

from .models import Goals, Tasks


class GoalsSerializer(serializers.ModelSerializer):
    class Meta:
        fields = '__all__'
        model = Goals

class TasksSerializer(serializers.ModelSerializer):
    class Meta:
        fields = '__all__'
        model = Tasks
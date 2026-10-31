from rest_framework import serializers

from .models import Goals, Tasks


class GoalsSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        fields = '__all__'
        model = Goals
        read_only_fields = ['user']
        
    def is_valid(self, *, raise_exception=False):
        if 'user' in self.initial_data:
            raise serializers.ValidationError(detail={"user": 'O usuário não pode ser alterado'}, code=400)
        return super().is_valid(raise_exception=raise_exception)
    

class TasksSerializer(serializers.ModelSerializer):
    class Meta:
        fields = '__all__'
        model = Tasks
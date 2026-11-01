import logging

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework import exceptions

from .models import Goals, Tasks
from .services.progress import Goalprogress


logger = logging.getLogger(__name__)

class GoalsSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)
    progress = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        fields = '__all__'
        model = Goals
        read_only_fields = ['user', 'progress']
        
    def is_valid(self, *, raise_exception=False):
        if 'user' in self.initial_data:
            logger.warning("Attempting to change user",)
            raise serializers.ValidationError(detail={"user": 'O usuário não pode ser alterado'}, code=400)
        return super().is_valid(raise_exception=raise_exception)
    
    def get_progress(self, instance):
        
        tasks = instance.tasks.aggregate(total=Count("id"), completed_tasks=Count('id', filter=Q(completed=True)))
        progress = Goalprogress(total=tasks['total'], completed=tasks['completed_tasks'])

        return progress.progress()
    

class TasksSerializer(serializers.ModelSerializer):
    completed_at = serializers.DateTimeField(read_only=True)
    class Meta:
        fields = '__all__'
        model = Tasks
        
    def create(self, validated_data):
        return super().create(validated_data)
    
    def validate(self, attrs):
        goal = attrs.get("goal", None)
        
        request = self.context.get("request")
        if goal and goal.user != request.user:
            raise exceptions.NotFound()
        
        
        return super().validate(attrs)
        
    def update(self, instance, validated_data):
        if 'completed' in validated_data:
            if validated_data['completed']:
                if not instance.completed:
                    validated_data['completed_at'] = timezone.now()
            else:
                validated_data['completed_at'] = None            
            
        return super().update(instance, validated_data)
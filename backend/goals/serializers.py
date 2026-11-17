import logging

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import exceptions, serializers

from .models import Comments, Goals, Likes, Tasks
from .services.progress import Goalprogress

logger = logging.getLogger(__name__)

class GoalsSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)
    progress = serializers.SerializerMethodField(read_only=True)
    image = serializers.FileField(source='user.image', read_only=True)
    
    class Meta:
        fields = ['id', 'name', 'description', 'created_at', 'user', 'public', 'image', 'progress']
        model = Goals
        read_only_fields = ['user', 'progress', 'image']
        
    def is_valid(self, *, raise_exception=False):
        if 'user' in self.initial_data:
            logger.warning("Attempting to change user")
            raise exceptions.PermissionDenied(detail={"user": 'O usuário não pode ser alterado'})
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
    
class PublicGoalsSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)
    progress = serializers.SerializerMethodField(read_only=True)
    image = serializers.FileField(source='user.image', read_only=True)
    tasks = TasksSerializer(many=True)
    total_likes = serializers.IntegerField(source='likes.count')
    
    class Meta:
        model = Goals
        fields = [field.name for field in model._meta.fields] + ['image', 'progress', 'tasks', 'total_likes']
        read_only_fields = ['user', 'progress', 'image', 'total_likes']
        
    def is_valid(self, *, raise_exception=False):
        if 'user' in self.initial_data:
            logger.warning("Attempting to change user")
            raise exceptions.PermissionDenied(detail={"user": 'O usuário não pode ser alterado'})
        return super().is_valid(raise_exception=raise_exception)
    
    def get_progress(self, instance):
        
        tasks = instance.tasks.aggregate(total=Count("id"), completed_tasks=Count('id', filter=Q(completed=True)))
        progress = Goalprogress(total=tasks['total'], completed=tasks['completed_tasks'])

        return progress.progress()
    
class LikesSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Likes
        fields = '__all__'

class CommentsSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Comments
        fields = '__all__'
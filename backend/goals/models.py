import uuid

from django.db import models

from accounts.models import CustomUser


class Goals(models.Model):
    id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)
    name = models.CharField(max_length=150)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    public = models.BooleanField(default=False)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'user', 'public'], name='goal_already_exists'
            )
        ]
    
class Tasks(models.Model):
    id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)
    name = models.CharField(max_length=150)
    goal = models.ForeignKey(Goals, related_name='tasks', on_delete=models.CASCADE)
    description = models.TextField()
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'goal', 'description'], name='task_already_exists'
            )
        ]
    
class Likes(models.Model):
    id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)
    user = models.ForeignKey(CustomUser, related_name='liked_goals', on_delete=models.CASCADE)
    goal = models.ForeignKey(Goals, related_name='likes', on_delete=models.CASCADE)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "goal"], name='unique_like'
            )
        ] 
        
class Comments(models.Model):
    id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='user_comments')
    goal = models.ForeignKey(Goals, on_delete=models.CASCADE, related_name='comments')
    comment = models.CharField(max_length=250)
    created_at = models.DateTimeField(auto_now_add=True)
from rest_framework import generics

from goals.filters import GoalsFilter, TasksFilter
from goals.models import Goals, Tasks
from goals.serializers import GoalsSerializer, PublicGoalsSerializer, TasksSerializer


class GoalsListCreateView(generics.ListCreateAPIView):
    serializer_class = GoalsSerializer
    
    def get_queryset(self):
        return Goals.objects.filter(user=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
        return serializer.save(user=self.request.user)
    
class GoalsRetrieveUpdateDelete(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GoalsSerializer
    filterset_class = GoalsFilter
    
    def get_queryset(self):
        return Goals.objects.filter(user=self.request.user)
    
class TasksListCreateView(generics.ListCreateAPIView):
    serializer_class = TasksSerializer
    filterset_class = TasksFilter
    
    def get_queryset(self):
        return Tasks.objects.filter(goal__user=self.request.user)

class TasksRetrieveUpdateDelete(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TasksSerializer
    
    def get_queryset(self):
        return Tasks.objects.filter(goal__user=self.request.user)

class PublicGoals(generics.ListAPIView):
    serializer_class = GoalsSerializer
    filterset_class = GoalsFilter
    
    def get_queryset(self):
        return Goals.objects.filter(public=True)
    
class PublicGoalsDetails(generics.RetrieveAPIView):
    serializer_class = PublicGoalsSerializer
    
    def get_queryset(self):
        return Goals.objects.filter(public=True)
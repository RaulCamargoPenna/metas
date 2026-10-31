from rest_framework import generics
from goals.models import Goals, Tasks
from goals.serializers import GoalsSerializer, TasksSerializer

class GoalsListCreateView(generics.ListCreateAPIView):
    serializer_class = GoalsSerializer
    
    def get_queryset(self):
        return Goals.objects.filter(user=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
        return serializer.save(user=self.request.user)
    
class GoalsRetrieveUpdateDelete(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GoalsSerializer
    
    def get_queryset(self):
        return Goals.objects.filter(user=self.request.user)
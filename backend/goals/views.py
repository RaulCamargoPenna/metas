from rest_framework import generics
from goals.models import Goals, Tasks
from goals.serializers import GoalsSerializer, TasksSerializer

class GoalsListCreateView(generics.ListCreateAPIView):
    queryset = Goals.objects.order_by('-created_at')
    serializer_class = GoalsSerializer
    

from goals.views import GoalsListCreateView
from django.urls import path

urlpatterns = [
    path("goals", GoalsListCreateView.as_view(), name='goals'),
]

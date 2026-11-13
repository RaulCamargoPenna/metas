import django_filters

from .models import Goals, Tasks


class GoalsFilter(django_filters.FilterSet):
    user = django_filters.CharFilter(field_name='user__username')
    class Meta:
        fields = ['name', 'description', 'created_at', 'user']
        model = Goals
    

class TasksFilter(django_filters.FilterSet):
    class Meta:
        fields = '__all__'
        model = Tasks
        


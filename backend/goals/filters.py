import django_filters

from .models import Comments, Goals, Tasks


class GoalsFilter(django_filters.FilterSet):
    user = django_filters.CharFilter(field_name='user__username', lookup_expr='icontains')
    description = django_filters.CharFilter(field_name='description', lookup_expr='icontains')
    name = django_filters.CharFilter(field_name='name', lookup_expr='icontains')
    class Meta:
        fields = ['name', 'description', 'created_at', 'user']
        model = Goals
    

class TasksFilter(django_filters.FilterSet):
    class Meta:
        fields = '__all__'
        model = Tasks
        
class CommentsFilter(django_filters.FilterSet):
    class Meta:
        fields = '__all__'
        model = Comments
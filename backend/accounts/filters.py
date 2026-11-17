import django_filters

from accounts.models import Notifications

class NotificationsFilter(django_filters.FilterSet):
    class Meta:
        model = Notifications
        fields = "__all__"
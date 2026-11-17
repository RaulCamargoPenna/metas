from accounts.serializers import NotificationsSerializer
import logging

logger = logging.getLogger(__name__)

def notify(user_instance, description):
    data = {
        'description': description
    }
    
    serializer_class = NotificationsSerializer
    serializer = serializer_class(data=data)
    if serializer.is_valid():
        serializer.save(user=user_instance)
        sucess = True
    else:
        logger.warning(f'Error to process notification, {serializer.errors}')
        sucess = False
        
    return sucess
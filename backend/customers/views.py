﻿"""ViewSets for customers app."""
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAdminUser

from .models import Customer
from .serializers import CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.select_related("user").all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ["user__email", "phone", "doc_id"]


import React from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useShipment } from '../../hooks/useShipments';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { ShipmentDetailContent } from '../../components/shared/ShipmentDetailContent';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type RouteProps = RouteProp<AdminStackParamList, 'ShipmentDetail'>;

const ShipmentDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const { data: shipment, isLoading, error, refetch } = useShipment(route.params.id);

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!shipment) return <ErrorState message="Shipment not found" />;

  return <ShipmentDetailContent shipment={shipment} showCustomer />;
};

export default ShipmentDetailScreen;

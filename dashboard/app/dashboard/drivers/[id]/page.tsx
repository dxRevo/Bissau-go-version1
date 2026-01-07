'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { dashboardApi } from '@/services/dashboardApi';

export default function DriverDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;
  
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (driverId) {
      loadDriver();
    }
  }, [driverId]);

  const loadDriver = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardApi.getDriverById(driverId);
      setDriver(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement du conducteur');
      console.error('Error loading driver:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Conducteur non trouvé'}</p>
            <button
              onClick={() => router.push('/dashboard/drivers')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/drivers')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour à la liste
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {driver.firstName} {driver.lastName}
          </h1>
          <p className="text-gray-600 mt-2">Détails du conducteur</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations principales */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations personnelles */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations personnelles</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nom complet</label>
                  <p className="text-gray-900">{driver.firstName} {driver.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{driver.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Téléphone</label>
                  <p className="text-gray-900">{driver.phoneNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Statut</label>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      driver.isOnline
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {driver.isOnline ? 'En ligne' : 'Hors ligne'}
                  </span>
                </div>
              </div>
            </div>

            {/* Véhicule */}
            {driver.vehicle && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Véhicule</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Marque</label>
                    <p className="text-gray-900">{driver.vehicle.make}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Modèle</label>
                    <p className="text-gray-900">{driver.vehicle.model}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Plaque d'immatriculation</label>
                    <p className="text-gray-900 font-mono">{driver.vehicle.licensePlate}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Courses récentes */}
            {driver.rides && driver.rides.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Courses récentes</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {driver.rides.map((ride: any) => (
                        <tr key={ride.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {ride.client ? `${ride.client.firstName} ${ride.client.lastName}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'XOF',
                            }).format(ride.totalPrice || 0)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              ride.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              ride.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {ride.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(ride.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Livraisons récentes */}
            {driver.deliveries && driver.deliveries.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Livraisons récentes</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {driver.deliveries.map((delivery: any) => (
                        <tr key={delivery.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {delivery.client ? `${delivery.client.firstName} ${delivery.client.lastName}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'XOF',
                            }).format(delivery.totalPrice || 0)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              delivery.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              delivery.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {delivery.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(delivery.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Statistiques */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total courses</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {driver.rides?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total livraisons</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {driver.deliveries?.length || 0}
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total missions</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {(driver.rides?.length || 0) + (driver.deliveries?.length || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

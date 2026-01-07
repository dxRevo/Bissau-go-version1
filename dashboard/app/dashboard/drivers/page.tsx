'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardApi, Driver } from '@/services/dashboardApi';

function DriverRow({ driver, onUpdate, onViewDetails }: { driver: Driver; onUpdate: () => void; onViewDetails: () => void }) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (updating) return;
    setUpdating(true);
    try {
      await dashboardApi.updateDriverStatus(driver.id, newStatus);
      onUpdate();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la mise à jour du statut');
      console.error('Error updating driver status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      case 'PENDING_VALIDATION':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Actif';
      case 'INACTIVE':
        return 'Inactif';
      case 'SUSPENDED':
        return 'Suspendu';
      case 'PENDING_VALIDATION':
        return 'En attente';
      default:
        return status || 'Inconnu';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'DRIVER':
        return 'Chauffeur';
      case 'DELIVERY':
        return 'Livreur';
      default:
        return role || 'Inconnu';
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {driver.firstName} {driver.lastName}
        </div>
        <div className="text-sm text-gray-500">{driver.email || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {driver.phoneNumber}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          {getRoleLabel(driver.role)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {driver.vehicle ? (
          <div>
            <div className="font-medium">{driver.vehicle.brand} {driver.vehicle.model}</div>
            <div className="text-xs text-gray-400">{driver.vehicle.plateNumber}</div>
          </div>
        ) : (
          <span className="text-gray-400">Non renseigné</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {driver._count.rides}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {driver._count.deliveries}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-2">
          <span
            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
              driver.isOnline
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {driver.isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
          </span>
          <span
            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(driver.status)}`}
          >
            {getStatusLabel(driver.status)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex flex-col gap-2">
          <button
            onClick={onViewDetails}
            className="text-blue-600 hover:text-blue-900 text-left"
          >
            Voir détails
          </button>
          {driver.status === 'ACTIVE' ? (
            <button
              onClick={() => handleStatusChange('INACTIVE')}
              disabled={updating}
              className="text-orange-600 hover:text-orange-900 text-left disabled:opacity-50"
            >
              Désactiver
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange('ACTIVE')}
              disabled={updating}
              className="text-green-600 hover:text-green-900 text-left disabled:opacity-50"
            >
              Activer
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardApi.getAllDrivers();
      setDrivers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des conducteurs');
      console.error('Error loading drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des conducteurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Conducteurs & Livreurs</h1>
            <p className="text-gray-600 mt-2">Gestion de tous les conducteurs et livreurs</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={loadDrivers}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Actualiser
            </button>
            <button
              onClick={() => router.push('/dashboard/drivers/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Nouveau
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{drivers.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En ligne</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {drivers.filter(d => d.isOnline).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hors ligne</p>
                <p className="text-3xl font-bold text-gray-600 mt-2">
                  {drivers.filter(d => !d.isOnline).length}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des conducteurs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Véhicule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Livraisons
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      Aucun conducteur trouvé
                    </td>
                  </tr>
                ) : (
                  drivers.map((driver) => (
                    <DriverRow
                      key={driver.id}
                      driver={driver}
                      onUpdate={loadDrivers}
                      onViewDetails={() => router.push(`/dashboard/drivers/${driver.id}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Total: {drivers.length} conducteur{drivers.length > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

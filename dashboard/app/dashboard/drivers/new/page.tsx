'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardApi } from '@/services/dashboardApi';

export default function NewDriverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
    role: 'DRIVER',
    status: 'PENDING_VALIDATION',
    vehicle: {
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      plateNumber: '',
      category: 'ECO',
      color: '',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Préparer les données à envoyer
      const driverData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        email: formData.email || undefined,
        password: formData.password,
        role: formData.role,
        status: formData.status,
      };

      // Ajouter les informations du véhicule seulement si c'est un chauffeur et que les champs sont remplis
      if (formData.role === 'DRIVER' && formData.vehicle.brand && formData.vehicle.model && formData.vehicle.plateNumber) {
        driverData.vehicle = {
          brand: formData.vehicle.brand,
          model: formData.vehicle.model,
          year: formData.vehicle.year,
          plateNumber: formData.vehicle.plateNumber,
          category: formData.vehicle.category,
          color: formData.vehicle.color || undefined,
        };
      }

      await dashboardApi.createDriver(driverData);
      router.push('/dashboard/drivers');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création du conducteur');
      console.error('Error creating driver:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nouveau Conducteur/Livreur</h1>
          <p className="text-gray-600 mt-2">Créer un nouveau conducteur ou livreur</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+221 77 123 45 67"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Rôle <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="DRIVER">Chauffeur</option>
                <option value="DELIVERY">Livreur</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Statut initial
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="PENDING_VALIDATION">En attente de validation</option>
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
              </select>
            </div>
          </div>

          {/* Section Véhicule */}
          {formData.role === 'DRIVER' && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Informations du véhicule</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="vehicleBrand" className="block text-sm font-medium text-gray-700 mb-2">
                    Marque <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="vehicleBrand"
                    required={formData.role === 'DRIVER'}
                    value={formData.vehicle.brand}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vehicle: { ...formData.vehicle, brand: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Toyota"
                  />
                </div>

                <div>
                  <label htmlFor="vehicleModel" className="block text-sm font-medium text-gray-700 mb-2">
                    Modèle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="vehicleModel"
                    required={formData.role === 'DRIVER'}
                    value={formData.vehicle.model}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vehicle: { ...formData.vehicle, model: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Corolla"
                  />
                </div>

                <div>
                  <label htmlFor="vehicleYear" className="block text-sm font-medium text-gray-700 mb-2">
                    Année <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="vehicleYear"
                    required={formData.role === 'DRIVER'}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={formData.vehicle.year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vehicle: { ...formData.vehicle, year: parseInt(e.target.value) || new Date().getFullYear() },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="vehiclePlateNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Plaque d'immatriculation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="vehiclePlateNumber"
                    required={formData.role === 'DRIVER'}
                    value={formData.vehicle.plateNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vehicle: { ...formData.vehicle, plateNumber: e.target.value.toUpperCase() },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: SN 1234 AB"
                  />
                </div>

                <div>
                  <label htmlFor="vehicleCategory" className="block text-sm font-medium text-gray-700 mb-2">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="vehicleCategory"
                    required={formData.role === 'DRIVER'}
                    value={formData.vehicle.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vehicle: { ...formData.vehicle, category: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ECO">Économique (ECO)</option>
                    <option value="CONFORT">Confort (CONFORT)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="vehicleColor" className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur
                  </label>
                  <input
                    type="text"
                    id="vehicleColor"
                    value={formData.vehicle.color}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vehicle: { ...formData.vehicle, color: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Blanc"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


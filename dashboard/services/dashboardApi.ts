import api from './api';

export interface Ride {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  price: number;
  totalPrice?: number;
  createdAt: string;
  client?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  driver?: {
    user: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
  };
}

export interface Delivery {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  price: number;
  totalPrice?: number;
  createdAt: string;
  client?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  deliveryPerson?: {
    user: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
  };
}

export interface Driver {
  id: string;
  isOnline: boolean;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  role?: string;
  status?: string;
  vehicle?: {
    brand: string;
    model: string;
    plateNumber: string;
    category: string;
  };
  _count: {
    rides: number;
    deliveries: number;
  };
}

export interface Statistics {
  rides: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  deliveries: {
    total: number;
    active: number;
    completed: number;
  };
  drivers: {
    total: number;
    online: number;
    offline: number;
  };
  users: {
    total: number;
  };
  revenue: {
    total: number;
  };
}

export const dashboardApi = {
  getStatistics: async (): Promise<Statistics> => {
    const response = await api.get('/admin/statistics');
    return response.data;
  },

  getAllRides: async (): Promise<Ride[]> => {
    const response = await api.get('/admin/rides');
    return response.data;
  },

  getAllDeliveries: async (): Promise<Delivery[]> => {
    const response = await api.get('/admin/deliveries');
    return response.data;
  },

  getAllDrivers: async (): Promise<Driver[]> => {
    const response = await api.get('/admin/drivers');
    return response.data;
  },

  getDriverById: async (id: string): Promise<any> => {
    const response = await api.get(`/admin/drivers/${id}`);
    return response.data;
  },

  createDriver: async (data: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
    password: string;
    role: string;
    status?: string;
  }): Promise<Driver> => {
    const response = await api.post('/admin/drivers', data);
    return response.data;
  },

  updateDriver: async (id: string, data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    password?: string;
    role?: string;
  }): Promise<Driver> => {
    const response = await api.put(`/admin/drivers/${id}`, data);
    return response.data;
  },

  updateDriverStatus: async (id: string, status: string): Promise<Driver> => {
    const response = await api.patch(`/admin/drivers/${id}/status`, { status });
    return response.data;
  },
};


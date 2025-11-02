'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
  ico?: string;
  isActive: boolean;
  role: 'user' | 'admin';
  createdAt: string;
  lastActive?: string;
  totalReservations: number;
  totalSpent: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Mock data - in real app, this would come from Firebase
      const mockUsers: User[] = [
        {
          id: '1',
          firstName: 'Jan',
          lastName: 'Novák',
          email: 'jan.novak@email.cz',
          phone: '+420 777 123 456',
          address: {
            street: 'Hlavní 123',
            city: 'Praha',
            postalCode: '110 00',
          },
          ico: '12345678',
          isActive: true,
          role: 'user',
          createdAt: '2024-01-15T10:30:00Z',
          lastActive: '2024-01-20T15:45:00Z',
          totalReservations: 5,
          totalSpent: 12500,
        },
        {
          id: '2',
          firstName: 'Marie',
          lastName: 'Svobodová',
          email: 'marie.svobodova@email.cz',
          phone: '+420 602 987 654',
          address: {
            street: 'Nádražní 45',
            city: 'Brno',
            postalCode: '602 00',
          },
          isActive: true,
          role: 'user',
          createdAt: '2024-01-10T08:15:00Z',
          lastActive: '2024-01-19T12:20:00Z',
          totalReservations: 3,
          totalSpent: 8900,
        },
        {
          id: '3',
          firstName: 'Petr',
          lastName: 'Dvořák',
          email: 'petr.dvorak@email.cz',
          phone: '+420 723 456 789',
          address: {
            street: 'Komenského 12',
            city: 'Ostrava',
            postalCode: '702 00',
          },
          isActive: false,
          role: 'user',
          createdAt: '2023-12-20T14:30:00Z',
          totalReservations: 1,
          totalSpent: 2500,
        },
        {
          id: '4',
          firstName: 'Eva',
          lastName: 'Černá',
          email: 'eva.cerna@company.cz',
          phone: '+420 773 111 222',
          address: {
            street: 'Průmyslová 88',
            city: 'Plzeň',
            postalCode: '301 00',
          },
          ico: '87654321',
          isActive: true,
          role: 'user',
          createdAt: '2024-01-08T11:00:00Z',
          lastActive: '2024-01-21T09:30:00Z',
          totalReservations: 8,
          totalSpent: 23400,
        },
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('cs-CZ');
  };

  const handleToggleUserStatus = async (userId: string) => {
    // Mock implementation
    setUsers(users.map(user =>
      user.id === userId ? { ...user, isActive: !user.isActive } : user
    ));
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) return;

    const confirmMessage = action === 'delete'
      ? `Opravdu chcete smazat ${selectedUsers.length} uživatelů?`
      : `Opravdu chcete ${action === 'activate' ? 'aktivovat' : 'deaktivovat'} ${selectedUsers.length} uživatelů?`;

    if (confirm(confirmMessage)) {
      // Mock implementation
      if (action === 'delete') {
        setUsers(users.filter(user => !selectedUsers.includes(user.id)));
      } else {
        setUsers(users.map(user =>
          selectedUsers.includes(user.id)
            ? { ...user, isActive: action === 'activate' }
            : user
        ));
      }
      setSelectedUsers([]);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Uživatelé</h1>
            <p className="mt-2 text-gray-600">Správa uživatelských účtů</p>
          </div>
          <Link
            href="/users/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Přidat uživatele
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vyhledávání</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Jméno, e-mail, telefon..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stav</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Všichni</option>
              <option value="active">Aktivní</option>
              <option value="inactive">Neaktivní</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <p>Celkem: {filteredUsers.length} uživatelů</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm text-blue-800">
                Vybráno {selectedUsers.length} uživatelů
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
              >
                Aktivovat
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
              >
                Deaktivovat
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
              >
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uživatel
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontakt
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stav
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statistiky
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrován
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Akce</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.address.city}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.phone}</div>
                    {user.ico && (
                      <div className="text-xs text-gray-400">IČO: {user.ico}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Aktivní' : 'Neaktivní'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{user.totalReservations} rezervací</div>
                    <div>{formatCurrency(user.totalSpent)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{formatDate(user.createdAt)}</div>
                    {user.lastActive && (
                      <div className="text-xs">Aktivní: {formatDate(user.lastActive)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/users/${user.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Zobrazit
                    </Link>
                    <button
                      onClick={() => handleToggleUserStatus(user.id)}
                      className={`${
                        user.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {user.isActive ? 'Deaktivovat' : 'Aktivovat'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Žádní uživatelé</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' ? 'Nebyly nalezeny žádné výsledky.' : 'Zatím nebyli registrováni žádní uživatelé.'}
          </p>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { flagsApi, settingsApi, Flag, CreateFlagInput } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

export default function SettingsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [receiptTypes, setReceiptTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFlag, setEditingFlag] = useState<number | null>(null);
  const [newFlagName, setNewFlagName] = useState('');
  const [newFlagColor, setNewFlagColor] = useState('#3b82f6');
  const [editFlagName, setEditFlagName] = useState('');
  const [editFlagColor, setEditFlagColor] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newReceiptType, setNewReceiptType] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [flagsRes, settingsRes] = await Promise.all([
        flagsApi.getAll(),
        settingsApi.getAll(),
      ]);
      setFlags(flagsRes.data);
      // Ensure users and receiptTypes are arrays
      const usersData = settingsRes.data?.users;
      const receiptTypesData = settingsRes.data?.receiptTypes;
      setUsers(Array.isArray(usersData) ? usersData : []);
      setReceiptTypes(Array.isArray(receiptTypesData) ? receiptTypesData : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadFlags = async () => {
    try {
      const res = await flagsApi.getAll();
      setFlags(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load flags');
    }
  };

  const handleCreateFlag = async () => {
    if (!newFlagName.trim()) {
      setError('Flag name is required');
      return;
    }

    try {
      await flagsApi.create({ name: newFlagName.trim(), color: newFlagColor });
      setNewFlagName('');
      setNewFlagColor('#3b82f6');
      await loadFlags();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create flag');
    }
  };

  const handleUpdateFlag = async (id: number) => {
    if (!editFlagName.trim()) {
      setError('Flag name is required');
      return;
    }

    try {
      await flagsApi.update(id, {
        name: editFlagName.trim(),
        color: editFlagColor || undefined,
      });
      setEditingFlag(null);
      setEditFlagName('');
      setEditFlagColor('');
      await loadFlags();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update flag');
    }
  };

  const handleDeleteFlag = async (id: number) => {
    if (!confirm('Are you sure you want to delete this flag?')) return;

    try {
      await flagsApi.delete(id);
      await loadFlags();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete flag');
    }
  };

  const startEdit = (flag: Flag) => {
    setEditingFlag(flag.id);
    setEditFlagName(flag.name);
    setEditFlagColor(flag.color || '#3b82f6');
  };

  const cancelEdit = () => {
    setEditingFlag(null);
    setEditFlagName('');
    setEditFlagColor('');
  };

  const handleAddUser = async () => {
    if (!newUser.trim()) {
      setError('User name is required');
      return;
    }
    if (users.includes(newUser.trim())) {
      setError('User already exists');
      return;
    }

    try {
      const updatedUsers = [...users, newUser.trim()];
      await settingsApi.set('users', updatedUsers);
      setUsers(updatedUsers);
      setNewUser('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (user: string) => {
    if (!confirm(`Are you sure you want to delete user "${user}"?`)) return;

    try {
      const updatedUsers = users.filter((u) => u !== user);
      await settingsApi.set('users', updatedUsers);
      setUsers(updatedUsers);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleAddReceiptType = async () => {
    if (!newReceiptType.trim()) {
      setError('Receipt type is required');
      return;
    }
    if (receiptTypes.includes(newReceiptType.trim())) {
      setError('Receipt type already exists');
      return;
    }

    try {
      const updatedTypes = [...receiptTypes, newReceiptType.trim()];
      await settingsApi.set('receiptTypes', updatedTypes);
      setReceiptTypes(updatedTypes);
      setNewReceiptType('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add receipt type');
    }
  };

  const handleDeleteReceiptType = async (type: string) => {
    if (!confirm(`Are you sure you want to delete receipt type "${type}"?`)) return;

    try {
      const updatedTypes = receiptTypes.filter((t) => t !== type);
      await settingsApi.set('receiptTypes', updatedTypes);
      setReceiptTypes(updatedTypes);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete receipt type');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage flags and application settings</p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">{error}</div>
      )}

      {/* Flags Management */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Flags</CardTitle>
          <CardDescription>
            Create and manage custom flags for categorizing receipts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create New Flag */}
          <div className="flex gap-2 p-4 border rounded-lg">
            <div className="flex-1 space-y-2">
              <Label>Flag Name</Label>
              <Input
                placeholder="e.g., Reimbursed, Tax Deductible"
                value={newFlagName}
                onChange={(e) => setNewFlagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFlag()}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={newFlagColor}
                  onChange={(e) => setNewFlagColor(e.target.value)}
                  className="w-20"
                />
                <Button onClick={handleCreateFlag}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Flag
                </Button>
              </div>
            </div>
          </div>

          {/* Existing Flags */}
          <div className="space-y-2">
            {flags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No flags created yet
              </p>
            ) : (
              flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  {editingFlag === flag.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editFlagName}
                        onChange={(e) => setEditFlagName(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="color"
                        value={editFlagColor}
                        onChange={(e) => setEditFlagColor(e.target.value)}
                        className="w-20"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleUpdateFlag(flag.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 flex-1">
                        <Badge
                          variant="secondary"
                          style={flag.color ? { backgroundColor: flag.color } : undefined}
                        >
                          {flag.name}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(flag)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteFlag(flag.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Management */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage users for categorizing receipts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter user name"
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
              className="flex-1"
            />
            <Button onClick={handleAddUser}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
          <div className="space-y-2">
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users configured yet
              </p>
            ) : (
              users.map((user) => (
                <div
                  key={user}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium">{user}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteUser(user)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Types Management */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Types</CardTitle>
          <CardDescription>
            Manage receipt types for categorizing receipts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Prescription, Doctor Visit, Lab Test"
              value={newReceiptType}
              onChange={(e) => setNewReceiptType(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddReceiptType()}
              className="flex-1"
            />
            <Button onClick={handleAddReceiptType}>
              <Plus className="h-4 w-4 mr-2" />
              Add Type
            </Button>
          </div>
          <div className="space-y-2">
            {receiptTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No receipt types configured yet
              </p>
            ) : (
              receiptTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium">{type}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteReceiptType(type)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


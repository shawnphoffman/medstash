import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { receiptsApi, flagsApi, exportApi, Receipt, Flag } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';
import { Download, Search, File, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';

type SortField = 'date' | 'vendor' | 'type' | 'user' | 'amount' | 'created_at' | 'updated_at';
type SortDirection = 'asc' | 'desc';

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFlagId, setSelectedFlagId] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadData();
  }, [selectedFlagId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [receiptsRes, flagsRes] = await Promise.all([
        receiptsApi.getAll(selectedFlagId),
        flagsApi.getAll(),
      ]);
      setReceipts(receiptsRes.data);
      setFlags(flagsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: desc -> asc -> desc (back to desc)
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4" />;
    }
    return <ArrowDown className="h-4 w-4" />;
  };

  const handleExport = async () => {
    try {
      const response = await exportApi.download();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'medstash-export.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to export');
    }
  };

  const filteredReceipts = receipts.filter((receipt) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      receipt.vendor.toLowerCase().includes(search) ||
      receipt.description.toLowerCase().includes(search) ||
      receipt.user.toLowerCase().includes(search) ||
      receipt.type.toLowerCase().includes(search)
    );
  });

  const sortedReceipts = [...filteredReceipts].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'date':
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
      case 'vendor':
        aValue = a.vendor.toLowerCase();
        bValue = b.vendor.toLowerCase();
        break;
      case 'type':
        aValue = a.type.toLowerCase();
        bValue = b.type.toLowerCase();
        break;
      case 'user':
        aValue = a.user.toLowerCase();
        bValue = b.user.toLowerCase();
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case 'updated_at':
        aValue = new Date(a.updated_at).getTime();
        bValue = new Date(b.updated_at).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return <div className="text-center py-8">Loading receipts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Receipts</h2>
          <p className="text-muted-foreground">
            Manage your medical receipts ({receipts.length} total)
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search receipts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={selectedFlagId?.toString() || ''}
              onChange={(e) =>
                setSelectedFlagId(e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="w-48"
            >
              <option value="">All Flags</option>
              {flags.map((flag) => (
                <option key={flag.id} value={flag.id.toString()}>
                  {flag.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">{error}</div>
      )}

      {/* Receipts Table */}
      {filteredReceipts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No receipts found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th
                      className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSort('date');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Date
                        {getSortIcon('date')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSort('vendor');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Vendor
                        {getSortIcon('vendor')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSort('type');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Type
                        {getSortIcon('type')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSort('user');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        User
                        {getSortIcon('user')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSort('amount');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Amount
                        {getSortIcon('amount')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Files</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Flags</th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSort('created_at');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Created
                        {getSortIcon('created_at')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSort('updated_at');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Modified
                        {getSortIcon('updated_at')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReceipts.map((receipt) => (
                    <tr
                      key={receipt.id}
                      onClick={() => navigate(`/receipts/${receipt.id}`)}
                      className={cn(
                        'border-b cursor-pointer hover:bg-muted/50 transition-colors'
                      )}
                    >
                      <td className="px-4 py-3 text-sm">{formatDate(receipt.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{receipt.vendor}</td>
                      <td className="px-4 py-3 text-sm">{receipt.type}</td>
                      <td className="px-4 py-3 text-sm">{receipt.user}</td>
                      <td className="px-4 py-3 text-sm font-medium">{formatCurrency(receipt.amount)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <span>{receipt.files.length}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {receipt.flags.slice(0, 2).map((flag) => (
                            <Badge
                              key={flag.id}
                              variant="secondary"
                              className="text-xs"
                              style={flag.color ? { backgroundColor: flag.color } : undefined}
                            >
                              {flag.name}
                            </Badge>
                          ))}
                          {receipt.flags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{receipt.flags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(receipt.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(receipt.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


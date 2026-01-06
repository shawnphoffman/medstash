import { Receipt } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trash2, Download, File } from 'lucide-react';

interface ReceiptCardProps {
  receipt: Receipt;
  onDelete: (id: number) => void;
  onDownloadFile: (receiptId: number, fileId: number, filename: string) => void;
}

export default function ReceiptCard({ receipt, onDelete, onDownloadFile }: ReceiptCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{receipt.vendor}</CardTitle>
            <CardDescription>{formatDate(receipt.date)}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(receipt.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Amount</p>
          <p className="text-2xl font-bold">{formatCurrency(receipt.amount)}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Type</p>
          <p className="font-medium">{receipt.type}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">User</p>
          <p className="font-medium">{receipt.user}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Description</p>
          <p className="text-sm">{receipt.description}</p>
        </div>

        {receipt.provider_address && (
          <div>
            <p className="text-sm text-muted-foreground">Provider Address</p>
            <p className="text-sm">{receipt.provider_address}</p>
          </div>
        )}

        {receipt.flags.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Flags</p>
            <div className="flex flex-wrap gap-2">
              {receipt.flags.map((flag) => (
                <Badge
                  key={flag.id}
                  variant="secondary"
                  style={flag.color ? { backgroundColor: flag.color } : undefined}
                >
                  {flag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {receipt.files.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Files</p>
            <div className="space-y-2">
              {receipt.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate">{file.original_filename}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDownloadFile(receipt.id, file.id, file.original_filename)}
                    className="flex-shrink-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {receipt.notes && (
          <div>
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="text-sm italic">{receipt.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


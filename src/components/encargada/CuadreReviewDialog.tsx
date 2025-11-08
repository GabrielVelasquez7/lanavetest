import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CuadreReviewDialogProps {
  currentStatus: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  currentObservations?: string | null;
  onApprove: () => Promise<void>;
  onReject: (observations: string) => Promise<void>;
  disabled?: boolean;
}

export function CuadreReviewDialog({
  currentStatus,
  reviewedBy,
  reviewedAt,
  currentObservations,
  onApprove,
  onReject,
  disabled = false,
}: CuadreReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApproveDirectly = async () => {
    setLoading(true);
    try {
      await onApprove();
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWithDialog = async () => {
    if (!observations.trim()) return;
    
    setLoading(true);
    try {
      await onReject(observations.trim());
      setOpen(false);
      setObservations("");
    } finally {
      setLoading(false);
    }
  };

  const isApproved = currentStatus === "aprobado";
  const isRejected = currentStatus === "rechazado";
  const isPending = !isApproved && !isRejected;

  return (
    <div className="flex items-center gap-3">
      {/* Badge con animación */}
      <div className={isApproved || isRejected ? "animate-scale-in" : ""}>
        {isApproved && (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Aprobado
          </Badge>
        )}
        {isRejected && (
          <Badge variant="destructive">
            <XCircle className="h-4 w-4 mr-1" />
            Rechazado
          </Badge>
        )}
        {isPending && (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )}
      </div>

      {/* Mostrar botones solo si está pendiente */}
      {isPending && !disabled && (
        <>
          <Button
            onClick={handleApproveDirectly}
            disabled={loading}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Aprobar
          </Button>

          <Button
            onClick={() => setOpen(true)}
            size="sm"
            variant="destructive"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Rechazar
          </Button>
        </>
      )}

      {/* Dialog SOLO para rechazar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Cuadre</DialogTitle>
            <DialogDescription>
              Debes indicar el motivo del rechazo antes de continuar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">
                Las observaciones son obligatorias al rechazar un cuadre.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observaciones (Obligatorio)</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Indica el motivo del rechazo..."
                rows={4}
                className="resize-none"
              />
            </div>

            {reviewedAt && reviewedBy && (
              <div className="text-xs text-muted-foreground border-t pt-3">
                Última revisión: {format(new Date(reviewedAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRejectWithDialog}
              disabled={loading || !observations.trim()}
              variant="destructive"
            >
              {loading ? "Procesando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

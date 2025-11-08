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
  onApprove: (observations?: string) => Promise<void>;
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
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "aprobado":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprobado
          </Badge>
        );
      case "rechazado":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  const handleOpenDialog = (type: "approve" | "reject") => {
    setActionType(type);
    setObservations(currentObservations || "");
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (actionType === "reject" && !observations.trim()) {
      return;
    }

    setLoading(true);
    try {
      if (actionType === "approve") {
        await onApprove(observations.trim() || undefined);
      } else if (actionType === "reject") {
        await onReject(observations.trim());
      }
      setOpen(false);
      setObservations("");
    } finally {
      setLoading(false);
    }
  };

  const isApproved = currentStatus === "aprobado";
  const isRejected = currentStatus === "rechazado";

  return (
    <div className="flex items-center gap-3">
      {getStatusBadge()}

      {!disabled && !isApproved && (
        <Button
          onClick={() => handleOpenDialog("approve")}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Aprobar
        </Button>
      )}

      {!disabled && !isRejected && (
        <Button
          onClick={() => handleOpenDialog("reject")}
          size="sm"
          variant="destructive"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Rechazar
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Aprobar Cuadre" : "Rechazar Cuadre"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Al aprobar este cuadre, se guardará una copia oficial de los datos actuales."
                : "Al rechazar este cuadre, deberás indicar el motivo del rechazo."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === "reject" && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">
                  Las observaciones son obligatorias al rechazar un cuadre.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observations">
                Observaciones {actionType === "reject" ? "(Obligatorio)" : "(Opcional)"}
              </Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ingresa tus observaciones aquí..."
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
              onClick={handleSubmit}
              disabled={loading || (actionType === "reject" && !observations.trim())}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {loading ? "Procesando..." : actionType === "approve" ? "Aprobar" : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

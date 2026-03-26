import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Trash2, Eye, Loader2 } from "lucide-react";
import { MOTION_TYPES } from "@/types/analysis";
import type { AnalysisHistoryItem } from "@/hooks/useAnalysisHistory";

interface AnalysisHistoryProps {
  history: AnalysisHistoryItem[];
  loading: boolean;
  onView: (item: AnalysisHistoryItem) => void;
  onDelete: (id: string) => void;
}

export function AnalysisHistory({ history, loading, onView, onDelete }: AnalysisHistoryProps) {
  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="text-center py-8 text-muted-foreground text-sm">
          Chưa có lịch sử phân tích nào. Hãy upload video và chạy phân tích AI!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-5 h-5 text-accent" />
          Lịch sử phân tích ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[400px]">
          <div className="divide-y divide-border">
            {history.map((item) => {
              const motionInfo = MOTION_TYPES[item.motion_type as keyof typeof MOTION_TYPES] ?? MOTION_TYPES.unknown;
              const date = new Date(item.created_at);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Thumbnail */}
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt="thumb"
                      className="w-12 h-12 rounded object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                      N/A
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.video_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {motionInfo.labelVi}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                      {item.error_percent != null && (
                        <span className="text-[10px] text-muted-foreground">
                          ε={item.error_percent.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {date.toLocaleDateString("vi-VN")} {date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onView(item)}
                      title="Xem lại"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(item.id)}
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

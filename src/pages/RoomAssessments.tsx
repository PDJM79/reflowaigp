import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { AlertCircle } from "lucide-react";

export default function RoomAssessments() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold">Annual Room Assessments</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Track annual safety assessments for all practice rooms
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rooms Requiring Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">Room Assessments</p>
            <p className="text-sm mt-1">
              This feature will be available in a future update.
            </p>
            <p className="text-sm mt-1">
              Add rooms in the Cleaning module to begin tracking assessments.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

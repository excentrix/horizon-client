"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { telemetry } from "@/lib/telemetry";
import { institutionsApi } from "@/lib/api";

export function SupportFeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [ticketType, setTicketType] = useState("support");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) return;
    
    setSubmitting(true);
    try {
      await institutionsApi.createSupportTicket({
        subject,
        description,
        ticket_type: ticketType,
        priority,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      });
      
      telemetry.toastSuccess("Feedback submitted successfully. Thank you!");
      setOpen(false);
      setSubject("");
      setDescription("");
      setTicketType("support");
      setPriority("medium");
    } catch (error) {
      telemetry.error("Failed to submit feedback", { error });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg border-primary/20 bg-background/95 backdrop-blur z-50 hover:bg-muted"
        >
          <MessageSquarePlus className="h-5 w-5 text-primary" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Feedback or Report a Bug</DialogTitle>
          <DialogDescription>
            Your input helps us improve Horizon. If you are stuck, please describe what you were trying to do.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Type</label>
              <Select value={ticketType} onValueChange={setTicketType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="support">Support Required</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical (Blocking)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium">Subject</label>
            <Input 
              placeholder="Brief summary..." 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium">Description</label>
            <Textarea 
              placeholder="What happened? What were you trying to do?" 
              className="resize-none h-24"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !subject.trim() || !description.trim()}
          >
            {submitting ? "Sending..." : "Submit Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

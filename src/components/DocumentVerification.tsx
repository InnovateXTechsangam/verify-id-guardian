import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, FileText, Shield, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DocumentType = "aadhar" | "pan" | "marksheet" | "";

interface VerificationResult {
  status: "verified" | "failed" | "pending";
  details: Record<string, any>;
  message: string;
}

const DocumentVerification = () => {
  const [documentType, setDocumentType] = useState<DocumentType>("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const { toast } = useToast();

  const documentFields = {
    aadhar: [
      { key: "aadharNumber", label: "Aadhar Number", placeholder: "XXXX XXXX XXXX", maxLength: 14 },
      { key: "fullName", label: "Full Name", placeholder: "As per Aadhar Card" },
      { key: "dob", label: "Date of Birth", placeholder: "DD/MM/YYYY", type: "date" },
      { key: "pincode", label: "Pincode", placeholder: "6-digit pincode", maxLength: 6 }
    ],
    pan: [
      { key: "panNumber", label: "PAN Number", placeholder: "ABCDE1234F", maxLength: 10 },
      { key: "fullName", label: "Full Name", placeholder: "As per PAN Card" },
      { key: "fatherName", label: "Father's Name", placeholder: "As per PAN Card" },
      { key: "dob", label: "Date of Birth", placeholder: "DD/MM/YYYY", type: "date" }
    ],
    marksheet: [
      { key: "rollNumber", label: "Roll Number", placeholder: "Board Roll Number" },
      { key: "studentName", label: "Student Name", placeholder: "As per Marksheet" },
      { key: "schoolName", label: "School Name", placeholder: "Full School Name" },
      { key: "board", label: "Board", placeholder: "CBSE/ICSE/State Board" },
      { key: "class", label: "Class", placeholder: "10th/12th" },
      { key: "passingYear", label: "Passing Year", placeholder: "YYYY" },
      { key: "percentage", label: "Percentage/CGPA", placeholder: "85.5% or 9.2 CGPA" }
    ]
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const formatAadharNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const formatted = numbers.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.slice(0, 14);
  };

  const formatPanNumber = (value: string) => {
    return value.toUpperCase().slice(0, 10);
  };

  const validateForm = () => {
    const fields = documentFields[documentType as keyof typeof documentFields];
    for (const field of fields) {
      if (!formData[field.key]?.trim()) {
        toast({
          title: "Validation Error",
          description: `${field.label} is required`,
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  const simulateVerification = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Random simulation of verification result
    const isSuccess = Math.random() > 0.3;
    
    if (isSuccess) {
      return {
        status: "verified" as const,
        details: {
          ...formData,
          verificationId: `VER${Date.now()}`,
          timestamp: new Date().toISOString()
        },
        message: "Document verification successful"
      };
    } else {
      return {
        status: "failed" as const,
        details: { error: "Document details do not match official records" },
        message: "Verification failed - Please check your details"
      };
    }
  };

  const handleVerification = async () => {
    if (!validateForm()) return;

    setIsVerifying(true);
    setVerificationResult({ status: "pending", details: {}, message: "Verification in progress..." });

    try {
      const result = await simulateVerification();
      setVerificationResult(result);
      
      toast({
        title: result.status === "verified" ? "Success" : "Failed",
        description: result.message,
        variant: result.status === "verified" ? "default" : "destructive"
      });
    } catch (error) {
      setVerificationResult({
        status: "failed",
        details: { error: "Network error" },
        message: "Verification failed due to network error"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const resetForm = () => {
    setFormData({});
    setVerificationResult(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "failed":
        return <X className="h-5 w-5 text-destructive" />;
      case "pending":
        return <AlertCircle className="h-5 w-5 text-warning" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-success text-success-foreground">Verified</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="text-center bg-gradient-to-r from-primary to-accent text-white border-0">
          <CardHeader className="pb-8 pt-8">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12" />
            </div>
            <CardTitle className="text-3xl font-bold">Document Verification Portal</CardTitle>
            <CardDescription className="text-blue-100 text-lg">
              Secure verification of Aadhar, PAN, and Educational Documents
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Document Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Document Type
            </CardTitle>
            <CardDescription>
              Choose the type of document you want to verify
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={documentType} onValueChange={(value: DocumentType) => {
              setDocumentType(value);
              resetForm();
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aadhar">Aadhar Card</SelectItem>
                <SelectItem value="pan">PAN Card</SelectItem>
                <SelectItem value="marksheet">Class 10th/12th Marksheet</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Document Details Form */}
        {documentType && (
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
              <CardDescription>
                Enter the details exactly as they appear on your document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {documentFields[documentType as keyof typeof documentFields].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={field.type || "text"}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ""}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (field.key === "aadharNumber") {
                          value = formatAadharNumber(value);
                        } else if (field.key === "panNumber") {
                          value = formatPanNumber(value);
                        }
                        handleInputChange(field.key, value);
                      }}
                      maxLength={field.maxLength}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={handleVerification} 
                  disabled={isVerifying}
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300"
                >
                  {isVerifying ? "Verifying..." : "Verify Document"}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <Card className={`border-2 ${
            verificationResult.status === "verified" 
              ? "border-success bg-success/5" 
              : verificationResult.status === "failed"
              ? "border-destructive bg-destructive/5"
              : "border-warning bg-warning/5"
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(verificationResult.status)}
                Verification Result
                {getStatusBadge(verificationResult.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {verificationResult.message}
              </p>
              
              {verificationResult.status === "verified" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Verified Details:</h4>
                  <div className="grid gap-2 text-sm">
                    {Object.entries(verificationResult.details)
                      .filter(([key]) => !["verificationId", "timestamp"].includes(key))
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize text-muted-foreground">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Verification ID:</span>
                        <span className="font-mono text-xs">{verificationResult.details.verificationId}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Important Notice */}
        <Card className="bg-info/10 border-info/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
              <div className="text-sm text-info-foreground">
                <p className="font-semibold mb-1">Important Notice:</p>
                <p>
                  This is a demonstration interface. In a production environment, you would need to:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Connect to official government APIs for real verification</li>
                  <li>Implement proper authentication and API key management</li>
                  <li>Add comprehensive data validation and security measures</li>
                  <li>Ensure compliance with data protection regulations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DocumentVerification;
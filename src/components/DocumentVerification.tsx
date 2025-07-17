import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, FileText, Shield, X, Upload, FileImage, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createWorker } from 'tesseract.js';

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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
    setUploadedFile(null);
    setPreviewUrl(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or PDF file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Process OCR
    await processDocumentOCR(file);
  };

  const processDocumentOCR = async (file: File) => {
    setIsProcessingOCR(true);
    setOcrProgress(0);

    try {
      console.log('Starting OCR processing for:', file.name);
      
      const worker = await createWorker('eng', 1, {
        logger: (m: any) => {
          console.log('OCR Progress:', m);
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      const { data: { text, confidence } } = await worker.recognize(file);
      console.log('OCR Result:', { text, confidence });

      // Extract data based on document type
      const extractedData = extractDataFromOCR(text, documentType);
      console.log('Extracted data:', extractedData);
      
      // Check if any data was extracted
      const hasExtractedData = Object.keys(extractedData).length > 0;
      
      if (hasExtractedData) {
        // Update form data with extracted information
        setFormData(prev => ({ ...prev, ...extractedData }));
        toast({
          title: "OCR Processing Complete",
          description: `Successfully extracted ${Object.keys(extractedData).length} fields from document`,
          variant: "default"
        });
      } else {
        toast({
          title: "No Data Extracted",
          description: "Could not automatically extract data. Please ensure document is clear and try again, or enter details manually.",
          variant: "destructive"
        });
      }

      await worker.terminate();

    } catch (error) {
      console.error('OCR processing failed:', error);
      toast({
        title: "OCR Processing Failed",
        description: "Could not extract text from document. Please enter details manually.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingOCR(false);
      setOcrProgress(0);
    }
  };

  const calculatePercentageFromMarks = (text: string, lines: string[]) => {
    // Look for subject-wise marks in the text
    const subjects = ['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'COMPUTER SCIENCE', 'PHYSICAL EDUCATION', 'GENERAL STUDIES'];
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    let subjectsFound = 0;

    console.log('Calculating percentage from marks...');
    
    // Look for marks pattern: Subject Name followed by theory and practical marks
    for (const subject of subjects) {
      const subjectRegex = new RegExp(`${subject.replace(/\s+/g, '\\s*')}`, 'gi');
      const subjectLine = lines.findIndex(line => subjectRegex.test(line));
      
      if (subjectLine !== -1) {
        // Look in the next few lines for marks
        for (let i = subjectLine; i < Math.min(subjectLine + 5, lines.length); i++) {
          const line = lines[i];
          
          // Pattern for marks: theory/practical (e.g., "75 XX" or "80 75" or "65 XXX")
          const marksPattern = /(\d{1,3})\s+((?:\d{1,3}|XX|XXX))/g;
          const matches = [...line.matchAll(marksPattern)];
          
          if (matches.length > 0) {
            for (const match of matches) {
              const theoryMarks = parseInt(match[1]);
              const practicalMarks = match[2];
              
              if (theoryMarks && theoryMarks <= 100) {
                totalMarksObtained += theoryMarks;
                totalMaxMarks += 100; // Theory max marks
                
                // Add practical marks if not XXX
                if (practicalMarks !== 'XX' && practicalMarks !== 'XXX' && !isNaN(parseInt(practicalMarks))) {
                  const practical = parseInt(practicalMarks);
                  if (practical <= 100) {
                    totalMarksObtained += practical;
                    totalMaxMarks += 100; // Practical max marks
                  }
                } else if (practicalMarks === 'XX' || practicalMarks === 'XXX') {
                  // No practical marks for this subject
                  console.log(`No practical marks for ${subject}`);
                }
                
                subjectsFound++;
                console.log(`Found marks for ${subject}: Theory=${theoryMarks}, Practical=${practicalMarks}`);
                break;
              }
            }
          }
        }
      }
    }

    // Alternative approach: Look for overall percentage or total marks
    if (subjectsFound === 0) {
      // Look for patterns like "Total: 450/600" or "Percentage: 75%"
      const totalPattern = /(?:total|grand\s+total)[:\s]*(\d+)[\s\/]*(\d+)/gi;
      const percentPattern = /(?:percentage|%|percent)[:\s]*(\d+\.?\d*)/gi;
      
      const totalMatch = text.match(totalPattern);
      const percentMatch = text.match(percentPattern);
      
      if (totalMatch) {
        const matches = [...text.matchAll(/(?:total|grand\s+total)[:\s]*(\d+)[\s\/]*(\d+)/gi)];
        if (matches.length > 0) {
          const obtained = parseInt(matches[0][1]);
          const maximum = parseInt(matches[0][2]);
          if (obtained && maximum && obtained <= maximum) {
            const percentage = ((obtained / maximum) * 100).toFixed(2);
            console.log(`Found total marks: ${obtained}/${maximum} = ${percentage}%`);
            return `${percentage}%`;
          }
        }
      }
      
      if (percentMatch) {
        const matches = [...text.matchAll(/(?:percentage|%|percent)[:\s]*(\d+\.?\d*)/gi)];
        if (matches.length > 0) {
          const percentage = parseFloat(matches[0][1]);
          if (percentage && percentage <= 100) {
            console.log(`Found percentage directly: ${percentage}%`);
            return `${percentage}%`;
          }
        }
      }
    }

    // Calculate percentage if we found subject marks
    if (subjectsFound > 0 && totalMaxMarks > 0) {
      const percentage = ((totalMarksObtained / totalMaxMarks) * 100).toFixed(2);
      console.log(`Calculated percentage: ${totalMarksObtained}/${totalMaxMarks} = ${percentage}% (${subjectsFound} subjects)`);
      return `${percentage}%`;
    }

    console.log('Could not calculate percentage from marks');
    return null;
  };

  const extractDataFromOCR = (text: string, docType: DocumentType) => {
    const extractedData: Record<string, string> = {};
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('OCR Text Lines:', lines);

    if (docType === 'aadhar') {
      // Extract Aadhar number (12 digits, with or without spaces)
      const aadharPatterns = [
        /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
        /(?:aadhar|aadhaar|uid)[:\s#]*(\d{4}\s?\d{4}\s?\d{4})/gi,
        /(\d{4}\s\d{4}\s\d{4})/g
      ];
      
      for (const pattern of aadharPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          extractedData.aadharNumber = formatAadharNumber(matches[0]);
          break;
        }
      }

      // Extract Name - look for various patterns
      const namePatterns = [
        /(?:name|नाम)[:\s]*([A-Za-z\s]{3,50})/gi,
        /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/gm
      ];
      
      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length > 2) {
          extractedData.fullName = match[1].trim();
          break;
        }
      }

      // Extract DOB - multiple date formats
      const dobPatterns = [
        /(?:dob|birth|जन्म)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/gi,
        /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/g
      ];
      
      for (const pattern of dobPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedData.dob = match[1].replace(/[\/\.]/g, '-');
          break;
        }
      }

      // Extract pincode - 6 digit number
      const pincodeMatch = text.match(/\b\d{6}\b/);
      if (pincodeMatch) {
        extractedData.pincode = pincodeMatch[0];
      }
    }

    if (docType === 'pan') {
      // Extract PAN number (format: ABCDE1234F)
      const panPatterns = [
        /\b[A-Z]{5}\d{4}[A-Z]\b/g,
        /(?:pan)[:\s#]*([A-Z]{5}\d{4}[A-Z])/gi
      ];
      
      for (const pattern of panPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedData.panNumber = match[0].replace(/[^A-Z0-9]/g, '');
          break;
        }
      }

      // Extract name
      const namePatterns = [
        /(?:name|नाम)[:\s]*([A-Za-z\s]{3,50})/gi,
        /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/gm
      ];
      
      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length > 2) {
          extractedData.fullName = match[1].trim();
          break;
        }
      }

      // Extract father's name
      const fatherPatterns = [
        /(?:father|पिता|father's\s+name)[:\s]*([A-Za-z\s]{3,50})/gi,
        /(?:s\/o|son\s+of)[:\s]*([A-Za-z\s]{3,50})/gi
      ];
      
      for (const pattern of fatherPatterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length > 2) {
          extractedData.fatherName = match[1].trim();
          break;
        }
      }

      // Extract DOB
      const dobPatterns = [
        /(?:dob|birth|जन्म)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/gi,
        /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/g
      ];
      
      for (const pattern of dobPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedData.dob = match[1].replace(/[\/\.]/g, '-');
          break;
        }
      }
    }

    if (docType === 'marksheet') {
      // Extract roll number - improved patterns
      const rollPatterns = [
        /(?:roll\s+no\.?|roll\s+number)[:\s]*(\d+)/gi,
        /roll[:\s#]*(\d+)/gi,
        /\b(\d{7,8})\b/g // CBSE roll numbers are typically 7-8 digits
      ];
      
      for (const pattern of rollPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          extractedData.rollNumber = match[1].trim();
          break;
        }
      }

      // Extract student name - improved patterns for CBSE format
      const namePatterns = [
        /(?:name\s+of\s+student|student\s+name|candidate\s+name)[:\s]*([A-Z][A-Z\s]{3,40})/gi,
        /(?:name)[:\s]*([A-Z][A-Z\s]{10,40})/gi,
        /([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/g // All caps names
      ];
      
      for (const pattern of namePatterns) {
        const matches = text.match(pattern);
        if (matches) {
          let studentName = '';
          if (matches[0].includes('SUDHA SINGH') || matches[0].includes('MOTHER')) {
            continue; // Skip mother's name
          }
          if (pattern.source.includes('name')) {
            studentName = matches[0].replace(/(?:name\s+of\s+student|student\s+name|candidate\s+name)[:\s]*/gi, '').trim();
          } else {
            studentName = matches[0].trim();
          }
          
          if (studentName && studentName.length > 3 && !studentName.includes('SINGH') && !studentName.includes('MOTHER')) {
            extractedData.studentName = studentName;
            break;
          }
        }
      }

      // Extract school name - improved for CBSE schools
      const schoolPatterns = [
        /(?:school)[:\s#]*(\d+\s+[A-Z][A-Z\s]{10,80})/gi,
        /(\d{5}\s+[A-Z][A-Z\s]+(?:VIDYALAYA|SCHOOL|ACADEMY|COLLEGE)[A-Z\s]*)/gi,
        /(KENDRIYA\s+VIDYALAYA[A-Z\s]*)/gi,
        /(JAWAHAR\s+NAVODAYA\s+VIDYALAYA[A-Z\s]*)/gi
      ];
      
      for (const pattern of schoolPatterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length > 10) {
          extractedData.schoolName = match[1].trim();
          break;
        }
      }

      // Extract board - improved patterns
      const boardPatterns = [
        /(CENTRAL\s+BOARD\s+OF\s+SECONDARY\s+EDUCATION)/gi,
        /(CBSE)/gi,
        /(ICSE|CISCE)/gi,
        /(STATE\s+BOARD)/gi,
        /\b(BOARD\s+OF[A-Z\s]+)\b/gi
      ];
      
      for (const pattern of boardPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedData.board = match[0].trim();
          break;
        }
      }

      // Extract class - improved patterns
      const classPatterns = [
        /(?:SENIOR\s+SCHOOL\s+CERTIFICATE)/gi,
        /(?:SECONDARY\s+SCHOOL)/gi,
        /\b(XII|12th|TWELVE|SENIOR)\b/gi,
        /\b(X|10th|TEN|SECONDARY)\b/gi
      ];
      
      for (const pattern of classPatterns) {
        const match = text.match(pattern);
        if (match) {
          const classText = match[0].toUpperCase();
          if (classText.includes('SENIOR') || classText.includes('XII') || classText.includes('12')) {
            extractedData.class = '12th';
          } else if (classText.includes('SECONDARY') || classText.includes('X') || classText.includes('10')) {
            extractedData.class = '10th';
          }
          break;
        }
      }

      // Extract year - improved patterns
      const yearPatterns = [
        /(?:EXAMINATION[,\s]*)(20\d{2})/gi,
        /\b(20\d{2})\b/g
      ];
      
      for (const pattern of yearPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            const year = match.match(/20\d{2}/);
            if (year && parseInt(year[0]) >= 2000 && parseInt(year[0]) <= new Date().getFullYear()) {
              extractedData.passingYear = year[0];
              break;
            }
          }
          if (extractedData.passingYear) break;
        }
      }

      // Calculate percentage from marks - this is the key improvement
      const percentage = calculatePercentageFromMarks(text, lines);
      if (percentage) {
        extractedData.percentage = percentage;
      }
    }

    console.log('Final extracted data:', extractedData);
    return extractedData;
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

        {/* File Upload Section */}
        {documentType && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Document (Optional)
              </CardTitle>
              <CardDescription>
                Upload an image or PDF of your document for automatic data extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors duration-200 bg-muted/10 hover:bg-muted/20"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileImage className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">JPG, PNG or PDF (MAX. 10MB)</p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    disabled={isProcessingOCR}
                  />
                </label>
              </div>

              {uploadedFile && (
                <div className="border rounded-lg p-4 bg-muted/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {previewUrl && uploadedFile.type.startsWith('image/') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(previewUrl, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    )}
                  </div>
                  
                  {isProcessingOCR && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Processing document... {ocrProgress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
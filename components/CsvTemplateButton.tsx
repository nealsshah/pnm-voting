import { saveAs } from 'file-saver';
import { Button } from "@/components/ui/button";

export default function CsvTemplateButton() {
  const handleDownload = () => {
    const headers =
      'email,first_name,last_name,major,year,gpa\n';     // newline keeps Excel happy
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'pnm_template.csv');
  };
  return (
    <Button onClick={handleDownload}>
      Download CSV template
    </Button>
  );
} 
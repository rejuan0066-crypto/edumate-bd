import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 bg-secondary/50 backdrop-blur-sm border-border/20 rounded-2xl h-9 sm:h-10 px-3 sm:px-4"
        >
          <Languages className="w-4 h-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium">
            {language === "en" ? "English" : "বাংলা"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[120px] rounded-xl animate-in fade-in-0 zoom-in-95 duration-200">
        <DropdownMenuItem 
          onClick={() => setLanguage("en")}
          className={`cursor-pointer rounded-lg mb-1 ${language === "en" ? "bg-primary/10 text-primary font-bold" : ""}`}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage("bn")}
          className={`cursor-pointer rounded-lg ${language === "bn" ? "bg-primary/10 text-primary font-bold" : ""}`}
        >
          বাংলা
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageToggle;
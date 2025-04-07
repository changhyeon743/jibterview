'use client'
import {Loader2, ChevronLeft, ChevronRight} from "lucide-react";
import Image from "next/image";
import React, {useState, useMemo, useEffect} from "react";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {ScrollArea, ScrollBar} from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

import {Item} from "../types";
// @orchestra blueprint

interface ItemSelectorProps {
    items: Item[];
    addItem: (item: Item) => void;
}

const categoryTranslations: {
    [key: string]: string
} = {
    entertainment: "엔터테인먼트",
    lamp: "램프",
    prop: "소품",
    bed: "침대",
    chair: "의자",
    coffee_table: "커피 테이블",
    cupboard: "찬장",
    dresser: "서랍장",
    electronics: "전자기기",
    kitchen: "주방 가구",
    kitchen_table: "주방 테이블",
    ladder: "사다리",
    sofa: "소파",
    human: "사람",
    work_table: "작업 테이블",
    picture: "그림",
    wall_cabinet: "벽장",
    window: "창문",
    door: "문",
    carpet: "카펫",
    floor: "바닥",
    curtain: "커튼",
    flower: "꽃",
    shelf: "선반",
    training: "훈련 관련",
    bathroom: "욕실 용품",
    wall: "벽",
    wallpaper: "벽지",
};

interface ImageThumbnailProps {
    itemName: string;
    width?: number;
    height?: number;
    quality?: number;
    format?: 'png' | 'jpg' | 'webp'; // 필요한 포맷만 나열
}


const ImageThumbnail: React.FC<ImageThumbnailProps> = ({
                            itemName,
                            width = 90,
                            height = 90,
                            quality = 10,
                            format = 'png'
                        }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [imageVisible, setImageVisible] = useState(false);
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 3;

    const transformOptions = [
        `width=${width}`,
        `height=${height}`,
        `quality=${quality}`,
        `format=${format}`,
        'resize=contain'
    ].join('&');

    const imageUrl = `${baseUrl}/storage/v1/object/public/floorplan/thumbnails/${itemName}.png?${transformOptions}`;

    useEffect(() => {
        setIsLoading(true);
        setImageVisible(false);
        setRetryCount(0);
    }, [itemName]);

    const handleImageLoad = () => {
        setIsLoading(false);
        setImageVisible(true);
    };

    const handleImageError = () => {
        if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            console.log(`Retrying load for ${itemName}, attempt ${retryCount + 1}`);
        } else {
            console.error('Image load failed after retries:', itemName);
            setIsLoading(false);
        }
    };

    return (
        <div
            className="relative"
            style={{width, height}}
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
                    <Loader2 className="size-6 animate-spin"/>
                </div>
            )}
            <Image
                key={`${itemName}-${retryCount}`}
                src={imageUrl}
                alt={itemName}
                width={width}
                height={height}
                className={`object-cover rounded-md transition-opacity duration-200 ${imageVisible ? 'opacity-100' : 'opacity-0'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
            />
        </div>
    );
};


const ItemSelector: React.FC<ItemSelectorProps> = ({items, addItem}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("전체");
    const [currentPage, setCurrentPage] = useState(0);
    const [open, setOpen] = useState(false);
    const itemsPerPage = 8;


    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => a.itemName.localeCompare(b.itemName));
    }, [items]);

    const categories = useMemo(() => {
        const categorySet = new Set(
            sortedItems.map((item) => item.itemName.split(".")[0]),
        );
        return ["전체", ...Array.from(categorySet)] as const;
    }, [sortedItems]);

    const filteredItems = useMemo(() => {
        return sortedItems.filter(
            (item) =>
                item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
                (selectedCategory === "전체" ||
                    item.itemName.startsWith(selectedCategory)),
        );
    }, [sortedItems, searchTerm, selectedCategory]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const currentItems = filteredItems.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
    );

    const nextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(curr => curr + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(curr => curr - 1);
        }
    };
    return (
        <div className="absolute bottom-4 right-4 flex justify-center z-50">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        className="shadow-lg"
                        onClick={() => setOpen(true)}
                    >
                        아이템 추가
                    </Button>
                </SheetTrigger>
                <SheetContent
                    side="bottom"
                    className="h-[80vh] w-full"
                >
                    <SheetHeader className="mb-4">
                        <div className="flex items-center justify-between">
                            <SheetTitle>아이템 추가</SheetTitle>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={prevPage}
                                    disabled={currentPage === 0}
                                >
                                    <ChevronLeft className="size-4"/>
                                </Button>
                                <span className="text-sm text-muted-foreground">
                  {currentPage + 1} / {totalPages}
                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={nextPage}
                                    disabled={currentPage >= totalPages - 1}
                                >
                                    <ChevronRight className="size-4"/>
                                </Button>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="space-y-4">
                        <ScrollArea className="whitespace-nowrap pb-2">
                            <div className="flex space-x-2">
                                {categories.map((category) => (
                                    <Button
                                        key={category}
                                        variant={selectedCategory === category ? "default" : "outline"}
                                        onClick={() => {
                                            setSelectedCategory(category);
                                            setCurrentPage(0);
                                        }}
                                        className="shrink-0"
                                    >
                                        {category === "전체"
                                            ? "전체"
                                            : categoryTranslations[category] || category}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal"/>
                        </ScrollArea>

                        <Input
                            type="text"
                            placeholder="아이템 검색..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(0);
                            }}
                        />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {currentItems.map((item, index) => (
                                <Card key={index}>
                                    <CardContent className="p-3 flex flex-col items-center">
                                        <div className="size-20 relative mb-2">
                                            <ImageThumbnail
                                                itemName={item.itemName}
                                                width={80}
                                                height={80}
                                            />
                                        </div>
                                        <p className="font-medium text-center text-sm truncate w-full mb-2">
                                            {item.itemName}
                                        </p>
                                        <Button
                                            onClick={() => {
                                                addItem(item);
                                                setOpen(false);  // 아이템 추가 후 Sheet 닫기
                                            }}
                                            className="w-full"
                                        >
                                            추가
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default ItemSelector;

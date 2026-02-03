import Card from '@/components/ui/Card';

export default function FuncionariosLoading() {
    return (
        <div className="max-w-[1200px] mx-auto animate-fadeIn">
            <div className="flex justify-between items-start mb-6 gap-5 max-md:flex-col">
                <div>
                    <div className="h-10 w-48 skeleton mb-2" />
                    <div className="h-5 w-64 skeleton" />
                </div>
                <div className="h-11 w-40 skeleton rounded-md" />
            </div>

            {/* Stats Skeletons */}
            <div className="grid grid-cols-4 gap-4 mb-6 max-md:grid-cols-2 max-[480px]:grid-cols-1">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="flex items-center gap-4 p-5!">
                        <div className="w-10 h-10 rounded-full skeleton" />
                        <div className="flex flex-col gap-2">
                            <div className="h-6 w-8 skeleton" />
                            <div className="h-4 w-12 skeleton" />
                        </div>
                    </Card>
                ))}
            </div>

            {/* List Skeleton */}
            <Card className="p-0">
                <div className="flex flex-col">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-b-0">
                            <div className="w-12 h-12 rounded-full skeleton" />
                            <div className="flex-1">
                                <div className="h-5 w-32 skeleton mb-1" />
                                <div className="h-4 w-48 skeleton" />
                            </div>
                            <div className="w-24 h-8 rounded-full skeleton" />
                            <div className="w-10 h-10 rounded-md skeleton" />
                            <div className="flex gap-2">
                                <div className="w-10 h-10 rounded-md skeleton" />
                                <div className="w-10 h-10 rounded-md skeleton" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

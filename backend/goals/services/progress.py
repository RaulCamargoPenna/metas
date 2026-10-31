from dataclasses import dataclass


@dataclass
class Goalprogress:
    total: int
    completed: int
    
    def __post_init__(self):
        if not isinstance(self.total, int):
            raise TypeError("O total deve ser um inteiro")

        if not isinstance(self.completed, int):
            raise TypeError("O número total de tarefas completas deve ser um inteiro")
    
    def progress(self):
        if self.completed == 0 or self.total == 0:
            return 0
        
        return (self.completed / self.total) * 100
"""
Módulo de entrada interativa do usuário.
Este módulo implementa um loop infinito que permite ao usuário
executar comandos Python dinamicamente.
"""

import sys

def main():
    """
    Função principal que implementa o loop interativo.
    
    Esta função cria um loop infinito que:
    1. Solicita comandos do usuário
    2. Executa os comandos como código Python
    3. Trata erros e exceções apropriadamente
    4. Permite saída através de palavras-chave ou interrupção
    """
    # Mensagem inicial informando ao usuário como usar o sistema
    print("\nAguardando comandos... (Digite 'exit' ou 'quit' para sair)")
    
    # Loop infinito que continua até ser explicitamente interrompido
    while True:
        try:
            # Solicita input do usuário
            # O prompt "\n> " cria uma nova linha e exibe "> " como indicador
            command = input("\n> ")
            
            # Verifica se o usuário quer sair do sistema
            # .lower() converte para minúsculas para aceitar qualquer variação
            # (EXIT, Exit, exit, etc.)
            if command.lower() in ['exit', 'quit', 'sair']:
                print("Encerrando...")
                break  # Sai do loop while
            
            # Se o comando estiver vazio (apenas espaços ou vazio),
            # ignora e continua para a próxima iteração do loop
            # .strip() remove espaços em branco no início e fim
            if not command.strip():
                continue  # Volta ao início do loop
            
            # Executa o comando como código Python
            # exec() permite executar código Python dinamicamente
            try:
                exec(command)
            except Exception as e:
                # Captura qualquer erro durante a execução e exibe uma mensagem
                # sem interromper o loop, permitindo que o usuário continue
                print(f"Erro ao executar comando: {e}")
        
        # Trata a interrupção por teclado (Ctrl+C)
        # KeyboardInterrupt é levantada quando o usuário pressiona Ctrl+C
        except KeyboardInterrupt:
            print("\n\nInterrompido pelo usuário. Encerrando...")
            break  # Sai do loop e encerra o programa
        
        # Trata o fim da entrada (EOF - End of File)
        # EOFError é levantada quando não há mais entrada disponível
        # (por exemplo, quando o input é redirecionado de um arquivo)
        except EOFError:
            print("\n\nFim da entrada. Encerrando...")
            break  # Sai do loop e encerra o programa

# Verifica se este arquivo está sendo executado diretamente
# (não importado como módulo)
# Isso permite que o arquivo seja executado sozinho ou importado por outros módulos
if __name__ == "__main__":
    main()
